interface ToastProps {
  message: string;
  type?: "error" | "success";
  onClose: () => void;
}

export function Toast({ message, type = "success", onClose }: ToastProps) {
  return (
    <div className="fixed right-5 top-5 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-soft">
      <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${type === "error" ? "bg-rose-500" : "bg-emerald-500"}`} />
      <div className="flex-1 text-sm text-slate-700">{message}</div>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close">×</button>
    </div>
  );
}
