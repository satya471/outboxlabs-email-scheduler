import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { GoogleLoginButton } from "./components/GoogleLoginButton";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { EmailTable } from "./components/EmailTable";
import { ComposeModal } from "./components/ComposeModal";
import { Toast } from "./components/Toast";
import { decodeGoogleCredential } from "./lib/google";
import { getSlackConnectUrl, searchEmails, splitByStatus } from "./lib/api";
import type { EmailRecord, UserProfile } from "./types";
import "./index.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const USER_STORAGE_KEY = "outboxlabs.user";

function Dashboard({ user, onLogout }: { user: UserProfile; onLogout: () => void }) {
  const [view, setView] = useState<"scheduled" | "sent">("scheduled");
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const loadEmails = useCallback(async () => {
    setLoading(true);
    try {
      const result = await searchEmails("");
      setEmails(result.emails);
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Unable to load emails.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEmails();
  }, [loadEmails]);

  const groups = useMemo(() => splitByStatus(emails), [emails]);
  const visibleEmails = view === "scheduled" ? groups.scheduled : groups.sent;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar active={view} onChange={setView} onCompose={() => setComposeOpen(true)} />

        <main className="min-w-0 flex-1">
          <Header
            user={user}
            onLogout={onLogout}
            onSlackConnect={() => window.open(getSlackConnectUrl(), "_blank", "noopener,noreferrer")}
          />

          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm text-slate-500 lg:hidden">
                    <button onClick={() => setView("scheduled")} className={view === "scheduled" ? "font-semibold text-emerald-600" : ""}>Scheduled</button>
                    <span>·</span>
                    <button onClick={() => setView("sent")} className={view === "sent" ? "font-semibold text-emerald-600" : ""}>Sent</button>
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {view === "scheduled" ? "Scheduled Emails" : "Sent Emails"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {view === "scheduled" ? "Keep an eye on your upcoming email deliveries." : "Review the delivery history of your campaigns."}
                  </p>
                </div>
                <button onClick={() => setComposeOpen(true)} className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600">
                  + Compose New Email
                </button>
              </div>

              <div className="mb-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Scheduled</div>
                  <div className="mt-2 text-2xl font-semibold">{groups.scheduled.length}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Sent / failed</div>
                  <div className="mt-2 text-2xl font-semibold">{groups.sent.length}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Total indexed</div>
                  <div className="mt-2 text-2xl font-semibold">{emails.length}</div>
                </div>
              </div>

              <EmailTable emails={visibleEmails} status={view} loading={loading} />
            </div>
          </div>
        </main>
      </div>

      {composeOpen && (
        <ComposeModal
          onClose={() => setComposeOpen(false)}
          onComplete={loadEmails}
          onToast={(message, type = "success") => setToast({ message, type })}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  function handleGoogleSuccess(credential: string) {
    try {
      const profile = decodeGoogleCredential(credential);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft lg:grid-cols-[1.05fr_.95fr]">
          <div className="hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">OutboxLabs</div>
              <h1 className="mt-8 max-w-md text-4xl font-semibold leading-tight">Simple scheduling for every campaign.</h1>
              <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">Plan your messages, upload leads, control pacing, and keep delivery status visible in one clean workspace.</p>
            </div>
            <div className="text-xs text-slate-400">React · TypeScript · Tailwind CSS</div>
          </div>

          <div className="p-8 sm:p-12">
            <div className="mx-auto max-w-sm">
              <div className="mb-10 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-2xl">✉</div>
                <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">Welcome back</h2>
                <p className="mt-2 text-sm text-slate-500">Sign in to your OutboxLabs Scheduler</p>
              </div>

              {!GOOGLE_CLIENT_ID ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-5 text-amber-800">
                  Add your real Google OAuth Web Client ID to <code>frontend/.env</code> as <code>VITE_GOOGLE_CLIENT_ID</code> before signing in.
                </div>
              ) : (
                <GoogleLoginButton onSuccess={handleGoogleSuccess} onError={() => setError("Google sign-in was cancelled or failed.")} />
              )}

              {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

              <div className="my-8 flex items-center gap-3 text-xs text-slate-400">
                <div className="h-px flex-1 bg-slate-200" />
                <span>Secure workspace access</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <p className="text-center text-xs leading-5 text-slate-400">Google is used for real account authentication. After successful sign-in, you'll be taken to your dashboard.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProtectedDashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (!stored) {
      navigate("/login", { replace: true });
      return;
    }
    try {
      setUser(JSON.parse(stored) as UserProfile);
    } catch {
      localStorage.removeItem(USER_STORAGE_KEY);
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  function logout() {
    localStorage.removeItem(USER_STORAGE_KEY);
    navigate("/login", { replace: true });
  }

  if (!user) return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading dashboard…</div>;
  return <Dashboard user={user} onLogout={logout} />;
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || "missing-client-id"}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedDashboard />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
