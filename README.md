# OutboxLabs Scheduler

A full-stack email scheduling application built for the OutboxLabs Software Development Intern assignment.

The system accepts email scheduling requests, persists email state in PostgreSQL, schedules delivery with BullMQ backed by Redis, sends mail through Ethereal SMTP, indexes email records in Elasticsearch for search, and provides a React dashboard for authentication, scheduling, and delivery history.

## Features

### Backend

- TypeScript + Express.js REST API
- PostgreSQL persistence
- BullMQ delayed jobs backed by Redis
- No cron jobs
- Ethereal Email SMTP for test delivery
- Elasticsearch indexing and search
- Idempotent scheduling using a stable SHA-256 job ID
- Configurable worker concurrency
- Minimum configurable delay between email sends
- Redis-backed hourly rate limiting
- Rate-limit handling that delays jobs instead of permanently dropping them
- Multiple sender support through the scheduled job payload
- Slack OAuth connection
- Slack notification when the configured hourly rate limit is reached
- Live BullMQ queue dashboard
- Persistent scheduled-email state across server restarts

### Frontend

- Real Google OAuth login
- Dashboard redirect after authentication
- User name, email, avatar, and logout
- Scheduled Emails view
- Sent Emails view
- Compose New Email flow
- CSV/TXT lead upload
- Email-address parsing and detected-recipient count
- Start time selection
- Delay between emails
- Hourly limit configuration
- Success, loading, empty, and error states
- Responsive UI styled to closely follow the supplied Figma design

## Tech Stack

### Backend

- Node.js
- TypeScript
- Express.js
- PostgreSQL
- Redis
- BullMQ
- Elasticsearch
- Nodemailer / Ethereal Email
- Slack Web API + Slack OAuth

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Google OAuth

### Infrastructure

- Docker / Docker Compose for local PostgreSQL and Redis services

## Project Structure

```text
outboxlabs-assignment/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── db/
│   │   ├── queues/
│   │   ├── routes/
│   │   ├── services/
│   │   └── workers/
│   ├── docker-compose.yml
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── .gitignore
├── package.json
└── package-lock.json
```

## Prerequisites

Install the following before running the project:

- Node.js
- Docker Desktop
- Git

For local development, PostgreSQL and Redis are run using Docker.

## Environment Variables

Do not commit real secrets to GitHub.

### Backend

Create:

```text
backend/.env
```

Example:

```env
PORT=5000

REDIS_PORT=6379
ELASTICSEARCH_URL=http://localhost:9200

EMAIL_FROM=sender@example.com
ETHEREAL_USER=your_ethereal_username
ETHEREAL_PASS=your_ethereal_password

MAX_EMAILS_PER_HOUR=200
MIN_DELAY_BETWEEN_EMAILS_MS=2000
WORKER_CONCURRENCY=5

SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_STATE_SECRET=your_slack_state_secret
SLACK_REDIRECT_URI=http://localhost:5000/slack/oauth_redirect
SLACK_BOT_TOKEN=your_slack_bot_token
```

Use the same database settings expected by the backend configuration in your local environment.

### Frontend

Create:

```text
frontend/.env
```

Example:

```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
```

For local Google OAuth development, authorize the frontend origins used by Vite, for example:

```text
http://localhost:5173
http://localhost:5174
```

## Ethereal Email Setup

Ethereal Email is used as a fake SMTP provider for testing.

1. Create an Ethereal test account.
2. Copy the SMTP username and password into:
   - `ETHEREAL_USER`
   - `ETHEREAL_PASS`
3. Set `EMAIL_FROM` to the default sender address.
4. The application uses Ethereal SMTP rather than sending real production email.

Multiple sender addresses can also be supplied through the scheduling request. The sender is persisted with the email and passed through the BullMQ job to the email service.

## Running the Backend

Open a terminal in the backend directory:

```powershell
cd backend
npm install
```

Start Docker services:

```powershell
docker compose up -d
```

Compile TypeScript:

```powershell
npx tsc
```

Start the compiled server:

```powershell
node dist/index.js
```

The API is available at:

```text
http://localhost:5000
```

The application exposes the BullMQ dashboard through the configured dashboard route shown by the backend startup logs.

## Running the Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Vite normally starts at:

```text
http://localhost:5173
```

If port 5173 is already occupied, Vite automatically uses another available port such as 5174.

## Scheduling Flow

The scheduling flow is:

```text
Frontend
   |
   | POST /api/emails/schedule
   v
Express API
   |
   +--> PostgreSQL
   |      persists sender, recipient, subject, body,
   |      scheduled time, status and job ID
   |
   +--> Elasticsearch
   |      indexes the scheduled email for search
   |
   +--> BullMQ
          creates a delayed job with a persistent job ID
                     |
                     v
                 Redis
                     |
                     v
               Email Worker
                     |
                     +--> rate-limit check
                     |
                     +--> minimum-delay enforcement
                     |
                     +--> Ethereal SMTP
                     |
                     +--> PostgreSQL status = sent
                     |
                     +--> Elasticsearch status update
```

### Why BullMQ delayed jobs are used

Scheduled delivery is implemented with BullMQ delayed jobs rather than cron jobs. Each job stores a persistent ID and scheduled delay, allowing Redis/BullMQ to retain the job independently of the Express process.

## Persistence and Restart Handling

The scheduler persists email records in PostgreSQL and uses Redis/BullMQ for delayed jobs.

On restart:

1. PostgreSQL retains the email record and its status.
2. Redis retains pending BullMQ jobs.
3. The worker reconnects to the existing queue.
4. Future jobs continue processing when their scheduled time arrives.
5. The stable job ID prevents the same scheduling request from being queued twice.

This was tested locally by scheduling a future email, restarting the backend, and verifying that the future email was still delivered and appeared in the Sent Emails view.

## Idempotency

Each scheduled email receives a stable SHA-256 job ID derived from the sender, recipient, subject, body, and scheduled time.

Before creating a new job, the API checks PostgreSQL for the same job ID.

The same ID is also supplied to BullMQ.

This prevents duplicate scheduling of the exact same request.

## Rate Limiting

The hourly email limit is configurable through:

```env
MAX_EMAILS_PER_HOUR=200
```

The worker uses Redis-backed rate limiting so the counter is not dependent only on in-memory application state.

When the configured hourly limit is reached:

- the job is not permanently discarded;
- the worker calculates a delay;
- the job is delayed/retried for a later window;
- processing resumes when capacity becomes available.

This approach supports multiple workers more safely than an in-memory counter.

## Delay Between Emails

The minimum delay is configurable through:

```env
MIN_DELAY_BETWEEN_EMAILS_MS=2000
```

For the demo configuration, this represents a minimum two-second spacing between individual sends.

The frontend also allows the user to choose the requested delay between emails.

## Worker Concurrency

Worker concurrency is configurable through:

```env
WORKER_CONCURRENCY=5
```

BullMQ can process multiple jobs in parallel up to the configured concurrency level while the Redis-backed rate-limit logic and per-job delay logic control outgoing email pacing.

## Elasticsearch Search

Scheduled and sent emails are indexed in Elasticsearch.

The search endpoint supports queries across fields including:

- recipient
- subject
- body
- sender
- status

Example:

```text
GET /api/emails/search?q=Final
```

If no query is supplied, the endpoint returns the indexed email records.

## Slack Integration

The dashboard provides a **Connect Slack** action.

The flow is:

```text
Frontend
   |
   v
Slack OAuth authorize
   |
   v
Backend OAuth callback
   |
   v
Slack credentials stored for the connected workspace/user
   |
   v
Rate limit reached
   |
   v
Slack notification sent
```

A live Slack notification was tested when the configured hourly rate limit was reached.

## Frontend Authentication

Google OAuth is implemented as a real authentication flow rather than a mock login.

After successful Google sign-in:

- the user is redirected to `/dashboard`;
- the dashboard shows the authenticated user's name;
- the user's email is shown;
- the user's avatar is shown;
- logout is available from the header.

## Frontend Email Composition

The Compose New Email interface supports:

- subject
- body
- CSV/TXT upload
- detected email-address count
- start time
- delay between emails
- hourly limit
- scheduling

The frontend sends scheduling information to the backend schedule API.

A local test successfully scheduled three recipients from a TXT file and displayed those emails as `sent` in the dashboard.

## Load / 1000+ Email Behavior

The assignment requires the design to handle 1000+ emails scheduled around the same time, but it explicitly does not require sending thousands of emails through Ethereal.

The implementation is designed for this scenario using:

- BullMQ delayed jobs
- Redis persistence
- configurable concurrency
- minimum send delay
- Redis-backed hourly rate limiting
- delayed processing when the hourly limit is exceeded
- persistent job IDs / idempotency

A 1,000-recipient CSV can be uploaded through the frontend to verify parsing and recipient detection without requiring 1,000 real SMTP deliveries.

## Testing Performed

The following flows were verified locally:

- Google OAuth login
- Dashboard redirect
- Frontend-to-backend scheduling
- TXT lead upload and recipient detection
- Three-recipient scheduling
- Ethereal email delivery
- Scheduled → sent status flow
- Elasticsearch indexing/search
- BullMQ processing
- Rate-limit delay behavior
- Slack notification on rate-limit hit
- Backend restart persistence
- Future scheduled email delivery after backend restart
- Custom sender support through the scheduling API

## No Cron Jobs

The application does not use:

- OS cron / crontab
- `node-cron`
- `agenda`
- other cron-based scheduling libraries

Scheduling is performed using BullMQ delayed jobs backed by Redis.

## Assumptions and Trade-offs

### Assumptions

- Ethereal Email is used only for test delivery.
- PostgreSQL and Redis are expected to be available locally through Docker.
- Elasticsearch is expected at the configured local URL.
- Google OAuth is configured for localhost during development.
- Slack OAuth requires a configured Slack app and valid credentials.

### Trade-offs

- Email delivery uses Ethereal instead of a production SMTP provider because the assignment specifies fake SMTP for testing.
- Elasticsearch indexing errors do not block the primary scheduling operation; the application logs the failure and continues.
- A configurable global hourly limit is used rather than a per-sender limit.
- Local development uses Vite's dynamic port behavior when the preferred port is already occupied.
- The frontend focuses on the supplied Figma workflow and assignment requirements rather than implementing a complete production email editor.

## Demo Checklist

The final demo should show, within five minutes:

1. Google login.
2. Dashboard with user information.
3. Compose and schedule an email.
4. Scheduled Emails view.
5. Sent Emails view.
6. Backend restart scenario.
7. Future scheduled email still sending after restart.
8. Brief rate-limit / delay behavior demonstration if time permits.

## Security Notes

- Never commit `.env` files.
- Never commit Slack bot tokens or client secrets.
- Never commit Ethereal passwords.
- Never commit Google OAuth client secrets.
- Only `.env.example` files should contain placeholder values suitable for source control.

## Submission Checklist

Before submission:

- [ ] Repository is private.
- [ ] `backend/` is pushed.
- [ ] `frontend/` is pushed.
- [ ] `.env` files are excluded from Git.
- [ ] `node_modules/` is excluded from Git.
- [ ] README includes setup and architecture details.
- [ ] `Mitrajit` has repository access.
- [ ] `Yadav036` has repository access.
- [ ] Demo video is five minutes or less.
- [ ] Demo shows scheduling and Scheduled/Sent views.
- [ ] Demo shows backend restart and future email delivery.
- [ ] Final GitHub repository link is ready.
- [ ] Final demo link is ready.
- [ ] ClickUp submission form is completed.

## License

This repository was created for the OutboxLabs hiring assignment.
