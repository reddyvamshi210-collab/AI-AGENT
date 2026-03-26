/**
 * CareerForge API Client
 * Handles all communication between the Next.js frontend and FastAPI backend.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Types ───────────────────────────────────────────────────────────────────

export interface Job {
  title: string;
  company: string;
  location: string;
  url: string;
  match_score: number;
}

export interface Action {
  type: "email" | "calendar" | "search";
  status: "completed" | "pending";
  detail: string;
}

export interface AgentResponse {
  reply: string;
  jobs: Job[];
  suggestions: string[];
  actions: Action[];
}

export interface HealthResponse {
  status: string;
  version: string;
}

export interface ResumeStatus {
  indexed: boolean;
  chunks: number;
}

export interface AuthStatus {
  authenticated: boolean;
  scopes: string[];
}

// ── API Functions ───────────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

/** Run the CareerForge agent with a user message. */
export async function runAgent(
  message: string,
  googleToken?: string
): Promise<AgentResponse> {
  return request<AgentResponse>("/agent/run", {
    method: "POST",
    body: JSON.stringify({
      message,
      google_token: googleToken || null,
    }),
  });
}

/** Check backend health. */
export async function checkHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

/** Check resume indexing status. */
export async function getResumeStatus(): Promise<ResumeStatus> {
  return request<ResumeStatus>("/resume/status");
}

/** Upload a resume PDF. */
export async function uploadResume(file: File): Promise<{ message: string; chunks: number }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/resume/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "Upload failed");
  }

  return res.json();
}

/** Get Google auth status. */
export async function getGoogleAuthStatus(): Promise<AuthStatus> {
  return request<AuthStatus>("/auth/google/status");
}

/** Get Google login URL. */
export async function getGoogleLoginUrl(): Promise<{ auth_url: string }> {
  return request<{ auth_url: string }>("/auth/google/login");
}
