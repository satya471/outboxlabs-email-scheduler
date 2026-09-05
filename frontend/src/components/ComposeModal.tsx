import { useMemo, useState } from "react";
import { scheduleEmail } from "../lib/api";

interface ComposeModalProps {
  onClose: () => void;
  onComplete: () => Promise<void>;
  onToast: (message: string, type?: "success" | "error") => void;
}

function extractEmails(text: string) {
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return [...new Set(matches.map((email) => email.trim().toLowerCase()))];
}

function calculateScheduledAt(start: string, delaySeconds: number, hourlyLimit: number, index: number) {
  const startMs = new Date(start).getTime();
  const safeHourlyLimit = Math.max(1, hourlyLimit);
  const hourBlock = Math.floor(index / safeHourlyLimit);
  const indexWithinHour = index % safeHourlyLimit;
  return new Date(startMs + hourBlock * 60 * 60 * 1000 + indexWithinHour * delaySeconds * 1000).toISOString();
}

export function ComposeModal({ onClose, onComplete, onToast }: ComposeModalProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [startTime, setStartTime] = useState(() => new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16));
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [leads, setLeads] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  const detectedText = useMemo(() => leads.length === 1 ? "1 email address detected" : `${leads.length} email addresses detected`, [leads.length]);

  function handleFile(file?: File) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setLeads(extractEmails(String(reader.result || "")));
    };
    reader.readAsText(file);
  }

  async function handleSchedule() {
    if (!subject.trim() || !body.trim()) {
      onToast("Please enter a subject and email body.", "error");
      return;
    }
    if (leads.length === 0) {
      onToast("Upload a CSV or text file containing email addresses.", "error");
      return;
    }

    const start = new Date(startTime);
    if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
      onToast("Choose a start time in the future.", "error");
      return;
    }

    setLoading(true);
    try {
      for (let index = 0; index < leads.length; index += 1) {
        await scheduleEmail({
          to: leads[index],
          subject,
          text: body,
          scheduledAt: calculateScheduledAt(startTime, delaySeconds, hourlyLimit, index),
        });
      }
      await onComplete();
      onToast(`${leads.length} email${leads.length === 1 ? "" : "s"} scheduled successfully.`);
      onClose();
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Unable to schedule emails.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Compose</div>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Compose New Email</h2>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-700">×</button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Subject</label>
              <input value={subject} onChange={(event) => setSubject(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-0 focus:border-emerald-400" placeholder="Your campaign subject" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Body</label>
              <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={11} className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400" placeholder="Write your email..." />
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Email leads</div>
                  <div className="mt-1 text-xs text-slate-500">Upload a CSV or text file containing email addresses.</div>
                </div>
                <label className="cursor-pointer rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
                  Upload file
                  <input type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
                </label>
              </div>
              <div className="mt-4 text-sm text-slate-700">
                {fileName ? <span className="font-medium">{fileName}</span> : "No file selected"}
              </div>
              <div className="mt-2 text-xs text-emerald-700">{detectedText}</div>
            </div>
          </div>

          <div className="space-y-5 rounded-2xl bg-slate-50 p-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Start time</label>
              <input type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Delay between emails (seconds)</label>
              <input type="number" min={1} value={delaySeconds} onChange={(event) => setDelaySeconds(Math.max(1, Number(event.target.value)))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Hourly limit</label>
              <input type="number" min={1} value={hourlyLimit} onChange={(event) => setHourlyLimit(Math.max(1, Number(event.target.value)))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm" />
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-xs leading-5 text-emerald-800">
              Emails are spaced using your selected delay. The backend also enforces its configured Redis-backed hourly limit.
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end">
          <button onClick={onClose} disabled={loading} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button onClick={handleSchedule} disabled={loading} className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? "Scheduling…" : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
