interface SidebarProps {
  active: "scheduled" | "sent";
  onChange: (view: "scheduled" | "sent") => void;
  onCompose: () => void;
}

export function Sidebar({ active, onChange, onCompose }: SidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="flex h-full min-h-screen flex-col px-5 py-6">
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-xl">✉</div>
          <div>
            <div className="text-sm font-semibold text-slate-900">OutboxLabs</div>
            <div className="text-xs text-slate-400">Email Scheduler</div>
          </div>
        </div>

        <button
          onClick={onCompose}
          className="mb-6 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          + Compose New Email
        </button>

        <div className="space-y-1">
          <button
            onClick={() => onChange("scheduled")}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm ${active === "scheduled" ? "bg-emerald-50 font-medium text-emerald-700" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <span>Scheduled Emails</span>
          </button>
          <button
            onClick={() => onChange("sent")}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm ${active === "sent" ? "bg-emerald-50 font-medium text-emerald-700" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <span>Sent Emails</span>
          </button>
        </div>

        <div className="mt-auto rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
          Schedule campaigns, review delivery status, and connect Slack notifications from one place.
        </div>
      </div>
    </aside>
  );
}
