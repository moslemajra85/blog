import express from "express";
import { randomBytes } from "crypto";
import cors from "cors";
import axios from "axios";

const app = express();
app.use(express.json());
app.use(cors());

const posts = [];

// GET all posts
app.get("/posts", (req, res) => {
  res.status(200).send(posts);
});

// CREATE a new post
app.post("/posts", async (req, res) => {
  const id = randomBytes(4).toString("hex");
  const { title } = req.body;

  if (!title) {
    return res.status(400).send({ error: "Title is required" });
  }

  const post = { id, title };
  posts.push(post);

  // Emit event to Event Bus
  try {
    await axios.post("http://localhost:4005/events", {
      type: "PostCreated",
      data: post,
    });
  } catch (error) {
    console.error("Error emitting PostCreated event:", error.message);
  }

  return res.status(201).send(post);
});

app.listen(5000, () => {
  console.log("Posts Service is running on port 5000");
});

// Event handler - for receiving events from Event Bus
app.post("/events", (req, res) => {
  console.log("Posts Service received event:", req.body.type);
  res.send({ status: "OK" });
});
