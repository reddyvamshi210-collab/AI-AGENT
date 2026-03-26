"""Calendar Tool - Create and list Google Calendar events."""
from datetime import datetime, timezone
from typing import Optional

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


class CalendarTool:
    """Wraps Google Calendar API for event management."""

    SCOPES = [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
    ]

    def __init__(self, token: Optional[str] = None):
        self.service = None
        if token:
            creds = Credentials(token=token)
            self.service = build("calendar", "v3", credentials=creds)

    def _ensure_service(self):
        if not self.service:
            raise RuntimeError("Calendar not authenticated. Connect your Google account first.")

    def create_event(
        self,
        summary: str,
        start_time: str,
        end_time: str,
        description: str = "",
    ) -> dict:
        """Create a new calendar event."""
        self._ensure_service()

        event_body = {
            "summary": summary,
            "description": description,
            "start": {"dateTime": start_time, "timeZone": "UTC"},
            "end": {"dateTime": end_time, "timeZone": "UTC"},
        }

        event = self.service.events().insert(
            calendarId="primary", body=event_body
        ).execute()

        return {
            "status": "created",
            "event_id": event.get("id", ""),
            "summary": summary,
            "start": start_time,
            "end": end_time,
            "link": event.get("htmlLink", ""),
        }

    def list_events(self, max_results: int = 10) -> list:
        """List upcoming calendar events."""
        self._ensure_service()

        now = datetime.now(timezone.utc).isoformat()

        result = self.service.events().list(
            calendarId="primary",
            timeMin=now,
            maxResults=max_results,
            singleEvents=True,
            orderBy="startTime",
        ).execute()

        events = []
        for item in result.get("items", []):
            start = item.get("start", {}).get("dateTime", item.get("start", {}).get("date", ""))
            events.append({
                "id": item.get("id", ""),
                "summary": item.get("summary", "(no title)"),
                "start": start,
                "link": item.get("htmlLink", ""),
            })

        return events
