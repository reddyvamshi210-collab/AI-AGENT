"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AgentCard } from "@/components/AgentCard";
import { StatusCard } from "@/components/StatusCard";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { runAgent, AgentResponse, checkHealth, getResumeStatus, getGoogleAuthStatus } from "@/lib/api";

interface Message {
  role: "user" | "agent";
  content: string;
  data?: AgentResponse;
  timestamp: Date;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const googleToken = searchParams.get("google_token") || "";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [resumeIndexed, setResumeIndexed] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Check statuses on mount
  useEffect(() => {
    (async () => {
      try {
        await checkHealth();
        setBackendStatus("online");
      } catch {
        setBackendStatus("offline");
      }

      try {
        const resumeStatus = await getResumeStatus();
        setResumeIndexed(resumeStatus.indexed);
      } catch { /* ignore */ }

      try {
        const authStatus = await getGoogleAuthStatus();
        setGoogleConnected(authStatus.authenticated);
      } catch { /* ignore */ }

      if (googleToken) {
        setGoogleConnected(true);
      }
    })();
  }, [googleToken]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await runAgent(text, googleToken || undefined);
      const agentMsg: Message = {
        role: "agent",
        content: data.reply,
        data,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        role: "agent",
        content: `Error: ${err.message || "Failed to reach the agent."}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    "Find me software engineering jobs",
    "Analyze my resume strengths",
    "Draft a follow-up email for an interview",
    "What skills should I learn next?",
    "Schedule a mock interview this week",
  ];

  return (
    <div className="flex h-screen bg-[#0a0a0f]">
      {/* Sidebar */}
      <aside className="w-72 bg-[#0f0f18] border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <h1 className="text-lg font-bold text-white">
            Career<span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">Forge</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">AI Career Agent</p>
        </div>

        {/* Status Cards */}
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          <StatusCard
            label="Backend"
            status={backendStatus === "online" ? "active" : backendStatus === "offline" ? "error" : "pending"}
            detail={backendStatus === "online" ? "Connected" : backendStatus === "offline" ? "Offline" : "Checking..."}
          />
          <StatusCard
            label="Resume"
            status={resumeIndexed ? "active" : "pending"}
            detail={resumeIndexed ? "Indexed" : "Not uploaded"}
          />
          <StatusCard
            label="Google"
            status={googleConnected ? "active" : "pending"}
            detail={googleConnected ? "Connected" : "Not connected"}
          />

          <div className="pt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Quick Actions
            </p>
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(action);
                }}
                className="w-full text-left text-sm text-gray-400 hover:text-brand-300 hover:bg-brand-500/10 rounded-lg px-3 py-2 transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-white/5">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
            ← Back to Home
          </a>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Chat Header */}
        <header className="bg-[#0f0f18]/80 backdrop-blur-md border-b border-white/5 px-6 py-4">
          <h2 className="font-semibold text-white">Agent Dashboard</h2>
          <p className="text-sm text-gray-500">Chat with your career agent</p>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-brand-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-500/20">
                  <svg className="w-8 h-8 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Ready to launch</h3>
                <p className="text-sm text-gray-500">
                  Ask me to find jobs, analyze your resume, draft emails, or manage your calendar.
                  Use a quick action from the sidebar or type your own request.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-2xl ${msg.role === "user" ? "order-1" : ""}`}>
                {/* Message bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-brand-600 text-white"
                      : "bg-white/5 border border-white/10 text-gray-200"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>

                {/* Agent data cards */}
                {msg.data && (
                  <div className="mt-3 space-y-3">
                    {/* Job Results */}
                    {msg.data.jobs.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-500 uppercase">Jobs Found</p>
                        {msg.data.jobs.map((job, j) => (
                          <AgentCard
                            key={j}
                            title={job.title}
                            subtitle={`${job.company} · ${job.location}`}
                            badge={`${job.match_score}% match`}
                            url={job.url}
                          />
                        ))}
                      </div>
                    )}

                    {/* Suggestions */}
                    {msg.data.suggestions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase mb-2">Suggestions</p>
                        <ul className="space-y-1">
                          {msg.data.suggestions.map((s, j) => (
                            <li key={j} className="text-sm text-gray-400 flex items-start gap-2">
                              <span className="text-brand-400 mt-0.5">•</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Actions */}
                    {msg.data.actions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase mb-2">Actions</p>
                        {msg.data.actions.map((a, j) => (
                          <div
                            key={j}
                            className="flex items-center gap-2 text-sm bg-white/5 rounded-lg px-3 py-2 border border-white/5"
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                a.status === "completed" ? "bg-green-500" : "bg-yellow-500"
                              }`}
                            />
                            <span className="text-gray-500 capitalize">{a.type}:</span>
                            <span className="text-gray-300">{a.detail}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-600 mt-1">
                  {msg.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="typing-dot w-2 h-2 bg-brand-400 rounded-full" />
                  <span className="typing-dot w-2 h-2 bg-brand-400 rounded-full" />
                  <span className="typing-dot w-2 h-2 bg-brand-400 rounded-full" />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-white/5 bg-[#0f0f18]/80 backdrop-blur-md p-4">
          <div className="max-w-3xl mx-auto flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Ask your career agent..."
              disabled={loading}
            />
            <Button onClick={handleSend} disabled={loading || !input.trim()}>
              {loading ? "Thinking..." : "Send"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-[#0a0a0f]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-brand-900 border-t-brand-400 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-500">Loading dashboard...</p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
