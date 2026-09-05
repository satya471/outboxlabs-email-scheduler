import type { UserProfile } from "../types";

interface HeaderProps {
  user: UserProfile;
  onLogout: () => void;
  onSlackConnect: () => void;
}

export function Header({ user, onLogout, onSlackConnect }: HeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">OutboxLabs Scheduler</div>
          <h1 className="mt-1 text-lg font-semibold text-slate-900">Manage your email campaigns</h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onSlackConnect}
            className="hidden rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 md:block"
          >
            Connect Slack
          </button>
          <div className="flex items-center gap-3 border-l border-slate-200 pl-3 sm:pl-4">
            {user.picture ? (
              <img src={user.picture} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden sm:block">
              <div className="text-sm font-medium text-slate-900">{user.name}</div>
              <div className="max-w-44 truncate text-xs text-slate-400">{user.email}</div>
            </div>
            <button onClick={onLogout} className="text-sm font-medium text-slate-500 hover:text-slate-900">
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
