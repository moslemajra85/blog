import express from "express";
import cors from "cors";
import axios from "axios";
import pg from "pg";
import { randomUUID } from "crypto";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 4000;
const EVENT_BUS_URL = process.env.EVENT_BUS_URL || "http://localhost:4003";
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://blog:blog@localhost:5432/posts_db";
const pool = new pg.Pool({ connectionString: DATABASE_URL });

const log = (message, meta = {}) => {
  console.log("[posts]", message, meta);
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const initDb = async () => {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS posts (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  res.send({ status: "OK", service: "posts" });
});

app.get("/posts", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, title FROM posts ORDER BY created_at DESC",
  );
  const allPosts = rows.map((post) => ({ id: post.id, title: post.title }));
  log("listing posts", { count: allPosts.length });
  res.status(200).send(allPosts);
});

app.post("/posts", async (req, res) => {
  const title = req.body?.title?.trim();

  if (!title) {
    log("post creation rejected", { reason: "missing title" });
    return res.status(400).send({ error: "Title is required" });
  }

  const post = {
    id: randomUUID(),
    title,
  };

  await pool.query("INSERT INTO posts (id, title) VALUES ($1, $2)", [
    post.id,
    post.title,
  ]);
  log("post stored", { postId: post.id, title: post.title });

  const event = {
    type: "PostCreated",
    data: post,
  };

  try {
    await axios.post(`${EVENT_BUS_URL}/events`, event);
    log("event sent to event bus", { type: event.type, postId: post.id });
  } catch (error) {
    log("failed to send event to event bus", {
      type: event.type,
      postId: post.id,
      error: error.message,
    });
  }

  res.status(201).send(post);
});

app.post("/events", (req, res) => {
  log("event received", { type: req.body?.type });
  res.send({ status: "OK" });
});

await initDb();

app.listen(PORT, () => {
  log("service running", { port: Number(PORT) });
});
