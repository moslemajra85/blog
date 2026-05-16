import express from "express";
import cors from "cors";
import axios from "axios";
import { randomUUID } from "crypto";

const app = express();
app.use(express.json());
app.use(cors());

const EVENT_BUS_URL = "http://localhost:4003";
const posts = {};

const log = (message, meta = {}) => {
  console.log("[posts]", message, meta);
};

app.get("/health", (req, res) => {
  log("health check requested");
  res.send({ status: "OK", service: "posts" });
});

app.get("/posts", (req, res) => {
  const allPosts = Object.values(posts);
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

  posts[post.id] = post;
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

app.listen(4000, () => {
  log("service running", { port: 4000 });
});
