export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

export interface EmailRecord {
  id: string;
  jobId: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt?: string;
  sentAt?: string;
  status: "scheduled" | "sent" | "failed" | string;
  messageId?: string;
  createdAt?: string;
}

export interface SearchResponse {
  count: number;
  emails: EmailRecord[];
}
