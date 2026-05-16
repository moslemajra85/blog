import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const posts = {};

const log = (message, meta = {}) => {
  console.log("[query]", message, meta);
};

app.get("/health", (req, res) => {
  log("health check requested");
  res.send({ status: "OK", service: "query" });
});

app.get("/posts", (req, res) => {
  const allPosts = Object.values(posts);
  log("listing aggregated posts", { count: allPosts.length });
  res.status(200).send(allPosts);
});

app.post("/events", (req, res) => {
  const { type, data } = req.body;

  log("event received", { type });

  if (type === "PostCreated") {
    posts[data.id] = {
      ...data,
      comments: [],
    };
    log("post added to read model", { postId: data.id });
  }

  if (type === "CommentCreated") {
    const post = posts[data.postId];

    if (!post) {
      log("comment ignored because post is missing", {
        postId: data.postId,
        commentId: data.id,
      });
      return res.send({ status: "OK" });
    }

    post.comments.push(data);
    log("comment added to read model", {
      postId: data.postId,
      commentId: data.id,
    });
  }

  res.send({ status: "OK" });
});

app.listen(4002, () => {
  log("service running", { port: 4002 });
});
