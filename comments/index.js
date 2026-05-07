import express from "express";
import { randomBytes } from "crypto";
import cors from "cors";
import axios from "axios";

const app = express();
app.use(express.json());
app.use(cors());

const comments = {};

// POST - create a comment for a post
app.post("/posts/:id/comments", async (req, res) => {
  const { id: postId } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).send({ error: "Content is required" });
  }

  const commentId = randomBytes(4).toString("hex");
  const comment = { id: commentId, postId, content, status: "pending" };

  if (!comments[postId]) {
    comments[postId] = [];
  }

  comments[postId].push(comment);

  // Emit event to Event Bus
  try {
    await axios.post("http://localhost:4005/events", {
      type: "CommentCreated",
      data: comment,
    });
  } catch (error) {
    console.error("Error emitting CommentCreated event:", error.message);
  }

  res.status(201).send(comment);
});

// GET - retrieve all comments for a post
app.get("/posts/:id/comments", (req, res) => {
  const { id: postId } = req.params;
  const postComments = comments[postId] || [];

  res.status(200).send(postComments);
});

// Event handler - for receiving events from Event Bus
app.post("/events", (req, res) => {
  console.log("Comments Service received event:", req.body.type);
  res.send({ status: "OK" });
});

app.listen(5001, () => {
  console.log("Comments Service is running on port 5001");
});
