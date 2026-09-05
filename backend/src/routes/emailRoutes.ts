import { Router } from "express";
import { emailQueue } from "../queues/emailQueue";
import { pool } from "../db/database";
import crypto from "crypto";
import { Client } from "@elastic/elasticsearch";

const router = Router();

const elasticsearch = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
});

router.post("/schedule", async (req, res) => {
  try {
    const {
      to,
      subject,
      text,
      scheduledAt,
      sender,
    } = req.body;

    if (!to || !subject || !text || !scheduledAt) {
      return res.status(400).json({
        error: "to, subject, text and scheduledAt are required",
      });
    }

    const scheduledTime = new Date(scheduledAt);

    if (Number.isNaN(scheduledTime.getTime())) {
      return res.status(400).json({
        error: "scheduledAt must be a valid date",
      });
    }

    const delay = scheduledTime.getTime() - Date.now();

    if (delay < 0) {
      return res.status(400).json({
        error: "scheduledAt must be a future time",
      });
    }

    const emailSender =
      sender || process.env.EMAIL_FROM || "sender@example.com";

    // Stable ID for idempotency
    const jobId = crypto
      .createHash("sha256")
      .update(
        `${emailSender}|${to}|${subject}|${text}|${scheduledAt}`
      )
      .digest("hex");

    // Check for an existing scheduled email
    const existing = await pool.query(
      `SELECT id, job_id, scheduled_at, status
       FROM emails
       WHERE job_id = $1`,
      [jobId]
    );

    if (existing.rows.length > 0) {
      return res.status(200).json({
        message: "Email already scheduled",
        jobId,
        scheduledAt: existing.rows[0].scheduled_at,
        status: existing.rows[0].status,
      });
    }

    // Persist in PostgreSQL
    await pool.query(
      `INSERT INTO emails
       (sender, recipient, subject, body, scheduled_at, status, job_id)
       VALUES ($1, $2, $3, $4, $5, 'scheduled', $6)`,
      [
        emailSender,
        to,
        subject,
        text,
        scheduledTime,
        jobId,
      ]
    );

    // Add persistent job to BullMQ
    const job = await emailQueue.add(
      "send-email",
      {
        to,
        subject,
        text,
        scheduledAt,
        sender: emailSender,
      },
      {
        jobId,
        delay,
        removeOnComplete: false,
        removeOnFail: false,
      }
    );

    // Index the scheduled email immediately
    try {
      await elasticsearch.index({
        index: "emails",
        id: String(jobId),
        document: {
          jobId,
          sender: emailSender,
          recipient: to,
          subject,
          body: text,
          scheduledAt: scheduledTime.toISOString(),
          status: "scheduled",
          createdAt: new Date().toISOString(),
        },
      });
    } catch (elasticError) {
      console.error(
        "Elasticsearch indexing failed:",
        elasticError
      );
    }

    res.status(201).json({
      message: "Email scheduled successfully",
      jobId: job.id,
      scheduledAt,
    });
  } catch (error) {
    console.error("Scheduling failed:", error);

    res.status(500).json({
      error: "Failed to schedule email",
    });
  }
});

// Search scheduled/sent emails using Elasticsearch
router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    const result = await elasticsearch.search({
      index: "emails",
      query: q
        ? {
            multi_match: {
              query: q,
              fields: [
                "recipient",
                "subject",
                "body",
                "sender",
                "status",
              ],
            },
          }
        : {
            match_all: {},
          },
      sort: [
        { sentAt: "desc" },
        { scheduledAt: "desc" },
      ],
    });

    const emails = result.hits.hits.map((hit) => ({
      id: hit._id,
      ...(hit._source as Record<string, unknown>),
    }));

    res.json({
      count: emails.length,
      emails,
    });
  } catch (error) {
    console.error(
      "Elasticsearch search failed:",
      error
    );

    res.status(500).json({
      error: "Failed to search emails",
    });
  }
});

export default router;