import { Router } from "express";
import crypto from "crypto";
import { pool } from "../db/database";
import Redis from "ioredis";

const router = Router();

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
});

const CLIENT_ID = process.env.SLACK_CLIENT_ID || "";
const CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || "";
const REDIRECT_URI =
  process.env.SLACK_REDIRECT_URI ||
  "http://localhost:5000/slack/oauth_redirect";

const TENANT_ID = "local-demo";

router.get("/connect", async (_req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).send("Slack OAuth credentials are not configured.");
  }

  const state = crypto.randomBytes(24).toString("hex");

  await redis.set(
    `slack-oauth-state:${state}`,
    TENANT_ID,
    "EX",
    600
  );

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    scope: "chat:write",
    redirect_uri: REDIRECT_URI,
    state,
  });

  res.redirect(
    `https://slack.com/oauth/v2/authorize?${params.toString()}`
  );
});

router.get("/oauth_redirect", async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).send(`Slack authorization failed: ${error}`);
    }

    if (
      typeof code !== "string" ||
      typeof state !== "string"
    ) {
      return res.status(400).send("Missing OAuth code or state.");
    }

    const tenantId = await redis.get(`slack-oauth-state:${state}`);

    if (!tenantId) {
      return res.status(400).send("Invalid or expired OAuth state.");
    }

    await redis.del(`slack-oauth-state:${state}`);

    const response = await fetch(
      "https://slack.com/api/oauth.v2.access",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
          redirect_uri: REDIRECT_URI,
        }).toString(),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      console.error("Slack OAuth error:", data);
      return res
        .status(400)
        .send(`Slack OAuth failed: ${data.error || "unknown_error"}`);
    }

    const teamId = data.team?.id;
    const teamName = data.team?.name || null;
    const botToken = data.access_token;
    const botUserId = data.bot_user_id || null;
    const userId = data.authed_user?.id;

    if (!teamId || !botToken || !userId) {
      return res.status(400).send(
        "Slack OAuth succeeded but required installation data is missing."
      );
    }

    await pool.query(
      `INSERT INTO slack_installations
       (tenant_id, team_id, team_name, user_id, bot_token, bot_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tenant_id)
       DO UPDATE SET
         team_id = EXCLUDED.team_id,
         team_name = EXCLUDED.team_name,
         user_id = EXCLUDED.user_id,
         bot_token = EXCLUDED.bot_token,
         bot_user_id = EXCLUDED.bot_user_id,
         updated_at = CURRENT_TIMESTAMP`,
      [
        tenantId,
        teamId,
        teamName,
        userId,
        botToken,
        botUserId,
      ]
    );

    res.send(`
      <html>
        <body style="font-family: Arial; padding: 40px;">
          <h2>Slack connected successfully ✅</h2>
          <p>Workspace: ${teamName || teamId}</p>
          <p>You can close this window and return to OutboxLabs Scheduler.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Slack OAuth callback failed:", error);
    res.status(500).send("Slack OAuth callback failed.");
  }
});

export default router;