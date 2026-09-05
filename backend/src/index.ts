import cors from "cors";
import slackRoutes from "./routes/slackRoutes";
import "./workers/emailWorker";
import emailRoutes from "./routes/emailRoutes";
import { testDatabaseConnection } from "./db/database";
import { initializeDatabase } from "./db/init";
import express from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { emailQueue } from "./queues/emailQueue";

const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
    ],
  })
);
app.use(express.json());

app.use("/api/emails", emailRoutes);
app.use("/slack", slackRoutes);

app.get("/", (req, res) => {
  res.json({ message: "OutboxLabs Assignment API is running" });
});

// BullMQ dashboard
// BullMQ dashboard
const serverAdapter = new ExpressAdapter();

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});



app.use("/admin/queues", serverAdapter.getRouter());
const PORT = 5000;

testDatabaseConnection();
initializeDatabase();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`BullMQ dashboard: http://localhost:${PORT}/admin/queues`);
});