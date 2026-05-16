import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();
app.use(express.json());
app.use(cors());

const serviceUrls = [
  "http://localhost:4000/events",
  "http://localhost:4001/events",
  "http://localhost:4002/events",
];

const events = [];

const log = (message, meta = {}) => {
  console.log("[event-bus]", message, meta);
};

app.get("/health", (req, res) => {
  log("health check requested");
  res.send({ status: "OK", service: "event-bus" });
});

app.get("/events", (req, res) => {
  log("listing stored events", { count: events.length });
  res.status(200).send(events);
});

app.post("/events", async (req, res) => {
  const event = req.body;

  if (!event?.type || !event?.data) {
    log("event rejected", { reason: "missing type or data" });
    return res.status(400).send({ error: "Event type and data are required" });
  }

  events.push(event);
  log("event received", { type: event.type });

  const broadcasts = await Promise.allSettled(
    serviceUrls.map((url) => axios.post(url, event)),
  );

  broadcasts.forEach((result, index) => {
    const serviceUrl = serviceUrls[index];

    if (result.status === "fulfilled") {
      log("event broadcast succeeded", { type: event.type, serviceUrl });
      return;
    }

    log("event broadcast failed", {
      type: event.type,
      serviceUrl,
      error: result.reason.message,
    });
  });

  res.status(202).send({ status: "OK" });
});

app.listen(4003, () => {
  log("service running", { port: 4003 });
});
