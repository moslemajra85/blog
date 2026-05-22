import express from "express";
import cors from "cors";
import pg from "pg";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 4002;
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://blog:blog@localhost:5432/query_db";
const pool = new pg.Pool({ connectionString: DATABASE_URL });

const log = (message, meta = {}) => {
  console.log("[query]", message, meta);
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const initDb = async () => {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS query_posts (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS query_comments (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL REFERENCES query_posts(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS query_comments_post_id_idx ON query_comments (post_id);

        CREATE TABLE IF NOT EXISTS pending_moderation_statuses (
          post_id TEXT NOT NULL,
          comment_id TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (post_id, comment_id)
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
  res.send({ status: "OK", service: "query" });
});

app.get("/posts", async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      p.id AS post_id,
      p.title AS post_title,
      p.created_at AS post_created_at,
      c.id AS comment_id,
      c.content AS comment_content,
      c.status AS comment_status
    FROM query_posts p
    LEFT JOIN query_comments c ON c.post_id = p.id
    ORDER BY p.created_at DESC, c.created_at ASC
  `);

  const postsById = new Map();

  rows.forEach((row) => {
    if (!postsById.has(row.post_id)) {
      postsById.set(row.post_id, {
        id: row.post_id,
        title: row.post_title,
        comments: [],
      });
    }

    if (row.comment_id) {
      postsById.get(row.post_id).comments.push({
        id: row.comment_id,
        postId: row.post_id,
        content: row.comment_content,
        status: row.comment_status,
      });
    }
  });

  const allPosts = [...postsById.values()];
  log("listing aggregated posts", { count: allPosts.length });
  res.status(200).send(allPosts);
});

app.post("/events", async (req, res) => {
  const { type, data } = req.body;

  log("event received", { type });

  if (type === "PostCreated") {
    await pool.query(
      `INSERT INTO query_posts (id, title)
       VALUES ($1, $2)
       ON CONFLICT (id)
       DO UPDATE SET title = EXCLUDED.title, updated_at = NOW()`,
      [data.id, data.title],
    );
    log("post added to read model", { postId: data.id });
  }

  if (type === "CommentCreated") {
    const post = await pool.query("SELECT id FROM query_posts WHERE id = $1", [
      data.postId,
    ]);

    if (post.rowCount === 0) {
      log("comment ignored because post is missing", {
        postId: data.postId,
        commentId: data.id,
      });
      return res.send({ status: "OK" });
    }

    const pendingStatus = await pool.query(
      `SELECT status
       FROM pending_moderation_statuses
       WHERE post_id = $1 AND comment_id = $2`,
      [data.postId, data.id],
    );
    const status = pendingStatus.rows[0]?.status || data.status;

    await pool.query(
      `INSERT INTO query_comments (id, post_id, content, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id)
       DO UPDATE SET
         content = EXCLUDED.content,
         status = EXCLUDED.status,
         updated_at = NOW()`,
      [data.id, data.postId, data.content, status],
    );

    await pool.query(
      `DELETE FROM pending_moderation_statuses
       WHERE post_id = $1 AND comment_id = $2`,
      [data.postId, data.id],
    );

    log("comment added to read model", {
      postId: data.postId,
      commentId: data.id,
      status,
    });
  }

  if (type === "CommentModerated") {
    const post = await pool.query("SELECT id FROM query_posts WHERE id = $1", [
      data.postId,
    ]);

    if (post.rowCount === 0) {
      log("moderated comment ignored because post is missing", {
        postId: data.postId,
        commentId: data.id,
      });
      return res.send({ status: "OK" });
    }

    const result = await pool.query(
      `UPDATE query_comments
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND post_id = $3`,
      [data.status, data.id, data.postId],
    );

    if (result.rowCount === 0) {
      await pool.query(
        `INSERT INTO pending_moderation_statuses (post_id, comment_id, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (post_id, comment_id)
         DO UPDATE SET status = EXCLUDED.status`,
        [data.postId, data.id, data.status],
      );

      log("moderated comment stored until comment arrives", {
        postId: data.postId,
        commentId: data.id,
        status: data.status,
      });
      return res.send({ status: "OK" });
    }

    log("comment status updated in read model", {
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
