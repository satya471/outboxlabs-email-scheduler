# OutboxLabs Scheduler Frontend

React + TypeScript + Tailwind CSS frontend matching the provided assignment screens.

## Setup

1. Create `.env` from `.env.example`.
2. Put your real Google OAuth Web Client ID in `VITE_GOOGLE_CLIENT_ID`.
3. Keep `VITE_API_URL=http://localhost:5000` while the backend runs locally.
4. In this folder run:

```bash
npm install
npm run dev
```

5. Open http://localhost:5173.

## Google OAuth

Create a Google OAuth 2.0 Web application and add:

- Authorized JavaScript origin: `http://localhost:5173`
- Authorized redirect URI: `http://localhost:5173`

The login uses Google's real OAuth identity flow through `@react-oauth/google`. After successful login, the app redirects to `/dashboard` and shows the user's name, email, and avatar.

## Backend integration

The frontend calls:

- `POST /api/emails/schedule`
- `GET /api/emails/search?q=...`
- `GET /slack/connect`

The current backend search endpoint is used for both scheduled and sent views.

## Design

The dashboard follows the supplied Figma screenshots: left navigation, clean white content cards, green accent, compose flow, scheduled/sent tabs, empty states, loading states, and inline error feedback.
