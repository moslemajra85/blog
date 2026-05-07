import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();
app.use(express.json());
app.use(cors());

// List of all services to broadcast events to
const services = [
  "http://localhost:5000", // Posts Service
  "http://localhost:5001", // Comments Service
  "http://localhost:5002", // Query Service
];

// Receive events from any service and broadcast to all
app.post("/events", async (req, res) => {
  const event = req.body;

  console.log("Event Bus received event:", event.type);

  // Broadcast event to all services
  for (const serviceUrl of services) {
    try {
      await axios.post(`${serviceUrl}/events`, event);
      console.log(`Event sent to ${serviceUrl}`);
    } catch (error) {
      console.error(`Error sending event to ${serviceUrl}:`, error.message);
    }
  }

  res.send({ status: "OK" });
});

app.listen(4005, () => {
  console.log("Event Bus is running on port 4005");
});
