import { WebClient } from "@slack/web-api";
import { pool } from "../db/database";

export async function sendSlackRateLimitNotification(
  tenantId: string,
  message: string
) {
  try {
    const result = await pool.query(
      `SELECT bot_token, user_id
       FROM slack_installations
       WHERE tenant_id = $1
       LIMIT 1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      console.log(`No Slack installation found for tenant: ${tenantId}`);
      return false;
    }

    const { bot_token, user_id } = result.rows[0];

    if (!bot_token || !user_id) {
      console.log(`Incomplete Slack installation for tenant: ${tenantId}`);
      return false;
    }

    const client = new WebClient(bot_token);

    // Open a DM conversation with the user who connected Slack
    const conversation = await client.conversations.open({
      users: user_id,
    });

    const channelId = conversation.channel?.id;

    if (!channelId) {
      console.log("Could not open Slack conversation.");
      return false;
    }

    await client.chat.postMessage({
      channel: channelId,
      text: message,
    });

    console.log(`Slack rate-limit notification sent for ${tenantId}`);
    return true;
  } catch (error) {
    console.error("Slack notification failed:", error);
    return false;
  }
}