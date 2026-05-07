import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

// In-memory storage: posts with their comments
const posts = {};

// GET - retrieve all posts with their comments
app.get("/posts", (req, res) => {
  const postsWithComments = Object.values(posts);
  res.send(postsWithComments);
});

// Event handler - listen to events from Event Bus
app.post("/events", (req, res) => {
  const { type, data } = req.body;

  console.log("Query Service received event:", type);

  if (type === "PostCreated") {
    // Add new post with empty comments array
    posts[data.id] = {
      ...data,
      comments: [],
    };
    console.log("Post added to Query Service:", data.id);
  }

  if (type === "CommentCreated") {
    // Add comment to the corresponding post
    const { postId, ...comment } = data;
    if (posts[postId]) {
      posts[postId].comments.push(comment);
      console.log("Comment added to post:", postId);
    }
  }

  res.send({ status: "OK" });
});

app.listen(5002, () => {
  console.log("Query Service is running on port 5002");
});
