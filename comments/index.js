import express from "express";
import cors from "cors";
import axios from "axios";
import pg from "pg";
import { randomUUID } from "crypto";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 4001;
const EVENT_BUS_URL = process.env.EVENT_BUS_URL || "http://localhost:4003";
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://blog:blog@localhost:5432/comments_db";
const pool = new pg.Pool({ connectionString: DATABASE_URL });

const log = (message, meta = {}) => {
  console.log("[comments]", message, meta);
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const initDb = async () => {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS comments (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL,
          content TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments (post_id);
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
  res.send({ status: "OK", service: "comments" });
});

app.get("/posts/:id/comments", async (req, res) => {
  const { id: postId } = req.params;
  const { rows } = await pool.query(
    `SELECT id, post_id, content, status
     FROM comments
     WHERE post_id = $1
     ORDER BY created_at ASC`,
    [postId],
  );
  const comments = rows.map((comment) => ({
    id: comment.id,
    postId: comment.post_id,
    content: comment.content,
    status: comment.status,
  }));

  log("listing comments", { postId, count: comments.length });
  res.status(200).send(comments);
});

app.post("/posts/:id/comments", async (req, res) => {
  const { id: postId } = req.params;
  const content = req.body?.content?.trim();

  if (!content) {
    log("comment creation rejected", { postId, reason: "missing content" });
    return res.status(400).send({ error: "Content is required" });
  }

  const comment = {
    id: randomUUID(),
    postId,
    content,
    status: "pending",
  };

  await pool.query(
    "INSERT INTO comments (id, post_id, content, status) VALUES ($1, $2, $3, $4)",
    [comment.id, comment.postId, comment.content, comment.status],
  );
  log("comment stored", { postId, commentId: comment.id });

  const event = {
    type: "CommentCreated",
    data: comment,
  };

  try {
    await axios.post(`${EVENT_BUS_URL}/events`, event);
    log("event sent to event bus", {
      type: event.type,
      postId,
      commentId: comment.id,
    });
  } catch (error) {
    log("failed to send event to event bus", {
      type: event.type,
      postId,
      commentId: comment.id,
      error: error.message,
    });
  }

  res.status(201).send(comment);
});

app.post("/events", async (req, res) => {
  const { type, data } = req.body;

  log("event received", { type });

  if (type === "CommentModerated") {
    const result = await pool.query(
      `UPDATE comments
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND post_id = $3`,
      [data.status, data.id, data.postId],
    );

    if (result.rowCount === 0) {
      log("moderated comment ignored because it is missing", {
        postId: data.postId,
        commentId: data.id,
      });
      return res.send({ status: "OK" });
    }

    log("comment status updated", {
      postId: data.postId,
      commentId: data.id,
      status: data.status,
    });
  }

  res.send({ status: "OK" });
});

await initDb();

app.listen(PORT, () => {
  log("service running", { port: Number(PORT) });
});
