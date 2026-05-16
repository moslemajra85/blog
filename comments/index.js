import express from "express";
import cors from "cors";
import axios from "axios";
import { randomUUID } from "crypto";

const app = express();
app.use(express.json());
app.use(cors());

const EVENT_BUS_URL = "http://localhost:4003";
const commentsByPostId = {};

const log = (message, meta = {}) => {
  console.log("[comments]", message, meta);
};

app.get("/health", (req, res) => {
  log("health check requested");
  res.send({ status: "OK", service: "comments" });
});

app.get("/posts/:id/comments", (req, res) => {
  const { id: postId } = req.params;
  const comments = commentsByPostId[postId] || [];

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
  };

  commentsByPostId[postId] = [...(commentsByPostId[postId] || []), comment];
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

app.post("/events", (req, res) => {
  log("event received", { type: req.body?.type });
  res.send({ status: "OK" });
});

app.listen(4001, () => {
  log("service running", { port: 4001 });
});
