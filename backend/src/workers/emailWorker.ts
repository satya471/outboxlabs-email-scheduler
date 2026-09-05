import { sendSlackRateLimitNotification } from "../services/slackService";
import { Worker } from "bullmq";
import dotenv from "dotenv";
import { Client } from "@elastic/elasticsearch";
import Redis from "ioredis";
import { pool } from "../db/database";
import { sendEmail } from "../services/emailService";

dotenv.config();

const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
};

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
});

const elasticsearch = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
});

const MAX_EMAILS_PER_HOUR =
  Number(process.env.MAX_EMAILS_PER_HOUR) || 200;

export const emailWorker = new Worker(
  "emailQueue",
  async (job) => {
    console.log("Processing email job:", job.id);

    const { to, subject, text, scheduledAt, sender } = job.data;

    // Redis-backed hourly counter
    const now = new Date();
    const hourKey = now.toISOString().slice(0, 13);
    const rateLimitKey = `email-rate:${hourKey}`;

    const count = await redis.incr(rateLimitKey);

    if (count === 1) {
      await redis.expire(rateLimitKey, 3700);
    }

    // Hourly limit reached
   if (count > MAX_EMAILS_PER_HOUR) {
  await redis.decr(rateLimitKey);

  const nextHour = new Date(now);
  nextHour.setMinutes(60, 0, 0);

  const delay = Math.max(
    nextHour.getTime() - Date.now(),
    1000
  );

  console.log(
    `Hourly limit reached. Delaying job ${job.id} for ${delay} ms`
  );

  await sendSlackRateLimitNotification(
    "local-demo",
    `⚠️ Email rate limit reached. The hourly limit of ${MAX_EMAILS_PER_HOUR} emails has been reached. New email jobs are being delayed until the next available window.`
  );

  await emailWorker.rateLimit(delay);
  throw Worker.RateLimitError();
}

    try {
      // Send email
      const info = await sendEmail(to, subject, text, sender);

      // Update PostgreSQL
      await pool.query(
        `UPDATE emails
         SET status = 'sent',
             sent_at = CURRENT_TIMESTAMP
         WHERE job_id = $1`,
        [job.id]
      );

      // Index sent email in Elasticsearch
      await elasticsearch.index({
        index: "emails",
        id: String(job.id),
        document: {
          jobId: String(job.id),
          sender:
            sender ||
            process.env.EMAIL_FROM ||
            "sender@example.com",
          recipient: to,
          subject,
          body: text,
          scheduledAt,
          sentAt: new Date().toISOString(),
          status: "sent",
          messageId: info.messageId,
        },
      });

      console.log("Email sent successfully:", job.id);
    } catch (error) {
      console.error("Email processing failed:", job.id, error);

      await pool.query(
        `UPDATE emails
         SET status = 'failed'
         WHERE job_id = $1`,
        [job.id]
      );

      throw error;
    }
  },
  {
    connection: redisConnection,

    // Configurable concurrency
    concurrency:
      Number(process.env.WORKER_CONCURRENCY) || 5,

    // Minimum delay between individual emails
    limiter: {
      max: 1,
      duration:
        Number(process.env.MIN_DELAY_BETWEEN_EMAILS_MS) || 2000,
    },
  }
);

emailWorker.on("completed", (job) => {
  console.log(`Email job ${job.id} completed`);
});

emailWorker.on("failed", (job, error) => {
  console.error(
    `Email job ${job?.id} failed:`,
    error.message
  );
});