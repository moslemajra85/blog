import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 4004;
const EVENT_BUS_URL = process.env.EVENT_BUS_URL || "http://localhost:4003";
const REJECTED_WORDS = ["stupid"];

const log = (message, meta = {}) => {
  console.log("[moderation]", message, meta);
};

const getModerationStatus = (content) => {
  const normalizedContent = String(content || "").toLowerCase();
  const hasRejectedWord = REJECTED_WORDS.some((word) => normalizedContent.includes(word));

  return hasRejectedWord ? "rejected" : "accepted";
};

app.get("/health", (req, res) => {
  log("health check requested");
  res.send({ status: "OK", service: "moderation" });
});

app.post("/events", async (req, res) => {
  const { type, data } = req.body;

  log("event received", { type });

  if (type !== "CommentCreated") {
    return res.send({ status: "OK" });
  }

  const status = getModerationStatus(data.content);
  const event = {
    type: "CommentModerated",
    data: {
      id: data.id,
      postId: data.postId,
      status,
    },
  };

  try {
    await axios.post(`${EVENT_BUS_URL}/events`, event);
    log("event sent to event bus", {
      type: event.type,
      postId: data.postId,
      commentId: data.id,
      status,
    });
  } catch (error) {
    log("failed to send event to event bus", {
      type: event.type,
      postId: data.postId,
      commentId: data.id,
      error: error.message,
    });
  }

  res.send({ status: "OK" });
});

app.listen(PORT, () => {
  log("service running", { port: Number(PORT) });
});
