"""
CareerForge Agent Engine
LangChain-style agent that orchestrates tools for career management.
"""
import json
import re
from typing import Optional
from openai import AsyncOpenAI

from tools.gmail_tool import GmailTool
from tools.calendar_tool import CalendarTool
from tools.resume_rag import ResumeRAG
from tools.job_search import JobSearchTool

SYSTEM_PROMPT = """You are CareerForge Agent, an AI career assistant. You help users with:

1. **Job Search**: Find relevant job opportunities based on the user's resume and preferences.
2. **Resume Analysis**: Analyze the user's resume, suggest improvements, and match skills to job postings.
3. **Email Management**: Draft and send professional emails (follow-ups, applications, networking).
4. **Calendar Scheduling**: Schedule interviews, networking events, and application deadlines.
5. **Career Suggestions**: Provide actionable career advice, skill gap analysis, and growth strategies.

You have access to these tools:
- search_jobs(query, location): Search for job listings
- analyze_resume(question): Query the user's uploaded resume
- send_email(to, subject, body): Send an email via Gmail
- list_emails(query, max_results): List recent emails
- create_calendar_event(summary, start_time, end_time, description): Create a calendar event
- list_calendar_events(max_results): List upcoming calendar events

When the user asks you to do something, decide which tools to use and execute them.
Always respond with structured JSON in this exact format:
{
  "reply": "Your conversational response to the user",
  "jobs": [{"title": "", "company": "", "location": "", "url": "", "match_score": 0}],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "actions": [{"type": "email|calendar|search", "status": "completed|pending", "detail": ""}]
}

If no jobs/suggestions/actions are relevant, use empty arrays.
"""

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_jobs",
            "description": "Search for job listings based on a query and optional location",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Job search query (title, skills, etc.)"},
                    "location": {"type": "string", "description": "Location filter (city, remote, etc.)"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_resume",
            "description": "Query the user's uploaded resume using RAG to answer questions about their experience, skills, etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {"type": "string", "description": "Question to ask about the resume"},
                },
                "required": ["question"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "send_email",
            "description": "Send an email via Gmail",
            "parameters": {
                "type": "object",
                "properties": {
                    "to": {"type": "string", "description": "Recipient email address"},
                    "subject": {"type": "string", "description": "Email subject"},
                    "body": {"type": "string", "description": "Email body text"},
                },
                "required": ["to", "subject", "body"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_emails",
            "description": "List recent emails from Gmail inbox",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Gmail search query"},
                    "max_results": {"type": "integer", "description": "Max emails to return", "default": 5},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_calendar_event",
            "description": "Create a Google Calendar event",
            "parameters": {
                "type": "object",
                "properties": {
                    "summary": {"type": "string", "description": "Event title"},
                    "start_time": {"type": "string", "description": "Start time in ISO 8601 format"},
                    "end_time": {"type": "string", "description": "End time in ISO 8601 format"},
                    "description": {"type": "string", "description": "Event description"},
                },
                "required": ["summary", "start_time", "end_time"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_calendar_events",
            "description": "List upcoming Google Calendar events",
            "parameters": {
                "type": "object",
                "properties": {
                    "max_results": {"type": "integer", "description": "Max events to return", "default": 10},
                },
                "required": [],
            },
        },
    },
]


class CareerForgeAgent:
    """Orchestrates the agent loop: LLM → tool calls → structured response."""

    def __init__(
        self,
        openai_api_key: str,
        google_token: Optional[str] = None,
        resume_rag: Optional[ResumeRAG] = None,
    ):
        self.client = AsyncOpenAI(api_key=openai_api_key)
        self.gmail = GmailTool(google_token) if google_token else None
        self.calendar = CalendarTool(google_token) if google_token else None
        self.resume_rag = resume_rag or ResumeRAG()
        self.job_search = JobSearchTool()

    async def _execute_tool(self, name: str, args: dict) -> str:
        """Execute a tool call and return the result as a string."""
        try:
            if name == "search_jobs":
                result = self.job_search.search(args.get("query", ""), args.get("location", ""))
            elif name == "analyze_resume":
                result = self.resume_rag.query(args.get("question", ""))
            elif name == "send_email":
                if not self.gmail:
                    return json.dumps({"error": "Gmail not connected. Please authenticate with Google first."})
                result = self.gmail.send_email(args["to"], args["subject"], args["body"])
            elif name == "list_emails":
                if not self.gmail:
                    return json.dumps({"error": "Gmail not connected. Please authenticate with Google first."})
                result = self.gmail.list_emails(args.get("query", ""), args.get("max_results", 5))
            elif name == "create_calendar_event":
                if not self.calendar:
                    return json.dumps({"error": "Calendar not connected. Please authenticate with Google first."})
                result = self.calendar.create_event(
                    args["summary"], args["start_time"], args["end_time"], args.get("description", "")
                )
            elif name == "list_calendar_events":
                if not self.calendar:
                    return json.dumps({"error": "Calendar not connected. Please authenticate with Google first."})
                result = self.calendar.list_events(args.get("max_results", 10))
            else:
                result = {"error": f"Unknown tool: {name}"}

            return json.dumps(result) if isinstance(result, (dict, list)) else str(result)
        except Exception as e:
            return json.dumps({"error": str(e)})

    async def run(self, user_message: str) -> dict:
        """Run the full agent loop: send message → handle tool calls → return structured response."""
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ]

        # Agent loop (max 5 iterations to prevent infinite loops)
        for _ in range(5):
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                tools=TOOL_DEFINITIONS,
                tool_choice="auto",
                temperature=0.3,
            )

            choice = response.choices[0]

            # If the model wants to call tools
            if choice.finish_reason == "tool_calls" and choice.message.tool_calls:
                messages.append(choice.message)

                for tool_call in choice.message.tool_calls:
                    fn_name = tool_call.function.name
                    fn_args = json.loads(tool_call.function.arguments)
                    result = await self._execute_tool(fn_name, fn_args)

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": result,
                    })
                continue

            # Final response from the model
            raw = choice.message.content or ""
            return self._parse_response(raw)

        # Fallback if loop exhausted
        return {
            "reply": "I processed your request but ran into complexity limits. Please try a simpler query.",
            "jobs": [],
            "suggestions": [],
            "actions": [],
        }

    def _parse_response(self, raw: str) -> dict:
        """Parse the LLM's JSON response, with fallback for plain text."""
        # Try to extract JSON from the response
        try:
            # Handle markdown code blocks
            json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
            if json_match:
                data = json.loads(json_match.group(1))
            else:
                data = json.loads(raw)

            return {
                "reply": data.get("reply", raw),
                "jobs": data.get("jobs", []),
                "suggestions": data.get("suggestions", []),
                "actions": data.get("actions", []),
            }
        except (json.JSONDecodeError, AttributeError):
            return {
                "reply": raw,
                "jobs": [],
                "suggestions": [],
                "actions": [],
            }
