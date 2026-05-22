import express from "express";
import cors from "cors";
import axios from "axios";
import pg from "pg";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 4003;
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://blog:blog@localhost:5432/event_bus_db";
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const serviceUrls = process.env.SERVICE_URLS
  ? process.env.SERVICE_URLS.split(",").map((url) => url.trim()).filter(Boolean)
  : [
      "http://localhost:4000/events",
      "http://localhost:4001/events",
      "http://localhost:4002/events",
      "http://localhost:4004/events",
    ];

const log = (message, meta = {}) => {
  console.log("[event-bus]", message, meta);
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const initDb = async () => {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS events (
          id BIGSERIAL PRIMARY KEY,
          type TEXT NOT NULL,
          data JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      return;
    } catch (error) {
      if (attempt === 20) {
        throw error;
      }

      log("database not ready, retrying", { attempt, error: error.message });
      await wait(1000);
    }
  }
};

app.get("/health", async (req, res) => {
  await pool.query("SELECT 1");
  log("health check requested");
  res.send({ status: "OK", service: "event-bus" });
});

app.get("/events", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT type, data FROM events ORDER BY id ASC",
  );
  const events = rows.map((event) => ({ type: event.type, data: event.data }));
  log("listing stored events", { count: events.length });
  res.status(200).send(events);
});

app.post("/events", async (req, res) => {
  const event = req.body;

  if (!event?.type || !event?.data) {
    log("event rejected", { reason: "missing type or data" });
    return res.status(400).send({ error: "Event type and data are required" });
  }

  await pool.query("INSERT INTO events (type, data) VALUES ($1, $2)", [
    event.type,
    event.data,
  ]);
  log("event received", { type: event.type });

  const broadcasts = await Promise.allSettled(
    serviceUrls.map((url) => axios.post(url, event)),
  );

  broadcasts.forEach((result, index) => {
    const serviceUrl = serviceUrls[index];

    if (result.status === "fulfilled") {
      log("event broadcast succeeded", { type: event.type, serviceUrl });
      return;
    }

    log("event broadcast failed", {
      type: event.type,
      serviceUrl,
      error: result.reason.message,
    });
  });

  res.status(202).send({ status: "OK" });
});

await initDb();

app.listen(PORT, () => {
  log("service running", { port: Number(PORT), subscribers: serviceUrls.length });
});
