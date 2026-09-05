import { pool } from "./database";

export async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS emails (
      id SERIAL PRIMARY KEY,
      sender VARCHAR(255) NOT NULL,
      recipient VARCHAR(255) NOT NULL,
      subject VARCHAR(500) NOT NULL,
      body TEXT NOT NULL,
      scheduled_at TIMESTAMP NOT NULL,
      sent_at TIMESTAMP NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
      job_id VARCHAR(255) UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS slack_installations (
      id SERIAL PRIMARY KEY,
      tenant_id VARCHAR(255) UNIQUE NOT NULL,
      team_id VARCHAR(255) NOT NULL,
      team_name VARCHAR(255),
      user_id VARCHAR(255),
      bot_token TEXT NOT NULL,
      bot_user_id VARCHAR(255),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("Database tables initialized");
}