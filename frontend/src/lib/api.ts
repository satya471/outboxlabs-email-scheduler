import type { EmailRecord, SearchResponse } from "../types";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function scheduleEmail(payload: {
  to: string;
  subject: string;
  text: string;
  scheduledAt: string;
}) {
  return request<{
    message: string;
    jobId: string;
    scheduledAt: string;
  }>("/api/emails/schedule", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function searchEmails(query = "") {
  return request<SearchResponse>(`/api/emails/search?q=${encodeURIComponent(query)}`);
}

export function getSlackConnectUrl() {
  return `${API_URL}/slack/connect`;
}

export function splitByStatus(records: EmailRecord[]) {
  return {
    scheduled: records.filter((email) => email.status === "scheduled"),
    sent: records.filter((email) => email.status === "sent" || email.status === "failed"),
  };
}
