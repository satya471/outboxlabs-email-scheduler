import type { EmailRecord } from "../types";

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

interface EmailTableProps {
  emails: EmailRecord[];
  status: "scheduled" | "sent";
  loading: boolean;
}

export function EmailTable({ emails, status, loading }: EmailTableProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <div className="space-y-4 animate-pulse">
          <div className="h-5 w-48 rounded bg-slate-100" />
          <div className="h-12 rounded bg-slate-100" />
          <div className="h-12 rounded bg-slate-100" />
          <div className="h-12 rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-xl">✉</div>
        <h3 className="text-sm font-semibold text-slate-900">
          {status === "scheduled" ? "No scheduled emails" : "No sent emails"}
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          {status === "scheduled" ? "Your scheduled campaigns will appear here." : "Delivered and failed emails will appear here."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Subject</th>
              <th className="px-5 py-4">{status === "scheduled" ? "Scheduled time" : "Sent time"}</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {emails.map((email) => (
              <tr key={email.jobId || email.id} className="hover:bg-slate-50">
                <td className="px-5 py-4 font-medium text-slate-800">{email.recipient}</td>
                <td className="max-w-xs px-5 py-4 text-slate-600">{email.subject}</td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                  {formatDate(status === "scheduled" ? email.scheduledAt : email.sentAt || email.scheduledAt)}
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${email.status === "failed" ? "bg-rose-50 text-rose-700" : status === "scheduled" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {email.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
