# Event-Driven Architecture Documentation

## Events System

This microservice architecture uses an event-driven pattern to decouple services. Services emit events when important actions occur, and other services react to these events.

---

## Event Types

### 1. PostCreated Event

**Emitted by:** Posts Service  
**Triggered when:** A new post is successfully created  
**Event Structure:**

```javascript
{
  type: "PostCreated",
  data: {
    id: "abc123",        // Random hex string
    title: "Hello World" // Post title
  }
}
```

**Who cares:** Query Service  
**Action taken:** Query Service stores the post with an empty comments array

```javascript
// Query Service receives the event
posts[data.id] = {
  ...data,
  comments: [], // Initialize empty comments array
};
```

---

### 2. CommentCreated Event

**Emitted by:** Comments Service  
**Triggered when:** A new comment is successfully created  
**Event Structure:**

```javascript
{
  type: "CommentCreated",
  data: {
    id: "xyz789",                    // Random hex string
    postId: "abc123",               // ID of the post this comment belongs to
    content: "Great post!",         // Comment text
    status: "pending"               // Comment approval status
  }
}
```

**Who cares:** Query Service  
**Action taken:** Query Service associates the comment with the correct post

```javascript
// Query Service receives the event
if (posts[postId]) {
  posts[postId].comments.push(comment);
}
```

---

## Event Bus Flow

### Step-by-Step Event Flow (Creating a Post Example)

```
1. React Client              Posts Service              Event Bus              Query Service
   │                             │                          │                        │
   ├─ POST /posts ────────────→  │                          │                        │
   │ (title: "Hello")            │                          │                        │
   │                             ├─ Create Post ───────┐   │                        │
   │                             │   id: "abc123"      │   │                        │
   │                             ├─ Emit PostCreated ─╫──→ POST /events         │
   │                             │ event               │   │ (type, data)         │
   │                             ←─ Response ─────────┴   │                        │
   │                             (201 Created)            ├─ Broadcast to ─────→  POST /events
   │                             │                        │  all services         (process event)
   │                             │                        │                        │
   │                             │                        │                        ├─ Store post
   │                             │                        │                        │  posts["abc123"] =
   │                             │                        │                        │  { id, title,
   │                             │                        │                        │    comments: [] }
   │                             │                        │                        │
   │─ Poll every 2s ──────────────────────────────────────→ GET /posts ─────────→ │
   │ (GET /posts from                                       (Query Service)       │
   │  Query Service)                                                              │
   │←─ Response ────────────────────────────────────────────────────────────────  ←─ Return posts
   │  [{ id, title, comments }]                                                     with comments
   │
   └─ Display new post

```

---

## Service Communication Pattern

### No Direct Service-to-Service Calls

Services do NOT directly communicate with each other:
❌ Posts Service does NOT call Query Service  
❌ Comments Service does NOT call Posts Service  
✅ All communication goes through Event Bus

### Event Bus as Message Router

The Event Bus acts as a central hub:

1. Receives event from a service
2. Broadcasts to ALL services
3. Each service checks the event type
4. If interested, service processes it; otherwise, ignores it

```javascript
// Event Bus Code
app.post("/events", async (req, res) => {
  const event = req.body;

  // Send to ALL services
  for (const serviceUrl of services) {
    await axios.post(`${serviceUrl}/events`, event);
  }

  res.send({ status: "OK" });
});
```

---

## Query Service - The Read Model

The Query Service is unique because it:

- **Doesn't know how to create data** (no POST /posts endpoint)
- **Only listens to events** and maintains its own copy of data
- **Serves all reads** from the client
- Uses an **in-memory data structure** as its database

```javascript
// Query Service data structure
const posts = {
  abc123: {
    id: "abc123",
    title: "Hello World",
    comments: [{ id: "xyz789", postId: "abc123", content: "Great!" }],
  },
  def456: {
    id: "def456",
    title: "Another Post",
    comments: [],
  },
};
```

### Query Service Data Management

```javascript
// Initialize posts object when service starts
const posts = {};

// Add post when PostCreated event arrives
if (type === "PostCreated") {
  posts[data.id] = {
    ...data,
    comments: [], // Add empty comments array
  };
}

// Add comment when CommentCreated event arrives
if (type === "CommentCreated") {
  const { postId, ...comment } = data;
  if (posts[postId]) {
    posts[postId].comments.push(comment);
  }
}

// Serve all data to client
app.get("/posts", (req, res) => {
  const postsWithComments = Object.values(posts);
  res.send(postsWithComments);
});
```

---

## Client Data Polling

The React client doesn't subscribe to events directly. Instead, it:

1. **Creates data** by sending requests to creation services
   - POST to Posts Service (5000)
   - POST to Comments Service (5001)

2. **Fetches data** from Query Service
   - GET from Query Service (5002)

3. **Polls regularly** for updates
   ```javascript
   // Client code
   useEffect(() => {
     const interval = setInterval(async () => {
       const response = await fetch("http://localhost:5002/posts");
       const posts = await response.json();
       setPosts(posts);
     }, 2000); // Poll every 2 seconds
   }, []);
   ```

---

## Event Flow Diagram

```
Creating a Post:
┌─────────────────────────────────────────────────────────────────┐
│ React Client                                                    │
│ ▼                                                               │
│ POST http://localhost:5000/posts                               │
│   {"title": "My Post"}                                          │
│ ▼                                                               │
│ Posts Service (5000)                                            │
│ ├─ Generate ID: "abc123"                                        │
│ ├─ Create post { id: "abc123", title: "My Post" }              │
│ ├─ Store in posts array                                         │
│ ├─ Return 201 Created                                           │
│ └─ POST http://localhost:4005/events                            │
│    { type: "PostCreated", data: { ... } }                       │
│ ▼                                                               │
│ Event Bus (4005)                                                │
│ ├─ Receive PostCreated event                                    │
│ ├─ Broadcast to http://localhost:5000/events ✓                │
│ ├─ Broadcast to http://localhost:5001/events ✓                │
│ └─ Broadcast to http://localhost:5002/events ✓                │
│ ▼                                                               │
│ Services receive event:                                         │
│ ├─ Posts Service: Ignores (already has post)                   │
│ ├─ Comments Service: Ignores (not its event)                   │
│ └─ Query Service: ✓ Processes!                                 │
│    posts["abc123"] = { id, title, comments: [] }              │
└─────────────────────────────────────────────────────────────────┘

Client fetches:
┌─────────────────────────────────────────────────────────────────┐
│ React Client                                                    │
│ ▼                                                               │
│ GET http://localhost:5002/posts (Query Service)               │
│ ▼                                                               │
│ Query Service returns:                                          │
│ [                                                               │
│   {                                                             │
│     id: "abc123",                                               │
│     title: "My Post",                                           │
│     comments: []                                                │
│   }                                                             │
│ ]                                                               │
│ ▼                                                               │
│ Client displays post with comments                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Advantages of Event-Driven Architecture

### 1. Loose Coupling

Services don't depend on each other directly. They only depend on events.

### 2. Scalability

Adding new services is easy - they just listen to events they care about.

### 3. Maintainability

Each service has a single responsibility:

- Posts Service: Manage posts
- Comments Service: Manage comments
- Query Service: Aggregate and serve data
- Event Bus: Route events

### 4. Fault Tolerance

If one service fails, others continue to function.

### 5. Eventual Consistency

Data becomes consistent across services over time (not immediately).

---

## Current Limitations

### 1. In-Memory Storage

Data is lost when services restart. Solution: Add database support.

### 2. No Persistence

No audit trail or event history. Solution: Implement event sourcing.

### 3. Polling Over Subscriptions

Client polls instead of using WebSockets. Solution: Upgrade to WebSocket events.

### 4. No Event Ordering

If multiple events arrive simultaneously, order isn't guaranteed. Solution: Use message queue (RabbitMQ, Kafka).

### 5. Synchronous Broadcasting

Event Bus waits for all services to respond. Solution: Implement async/fire-and-forget.

---

## Future Improvements

1. **Add Database Layer**
   - PostgreSQL for persistent storage
   - Replace in-memory arrays with database queries

2. **Implement Message Queue**
   - Use RabbitMQ or Kafka for reliable event delivery
   - Add event ordering guarantees

3. **WebSocket Support**
   - Real-time updates without polling
   - Server-push events to client

4. **Event Sourcing**
   - Store all events as immutable log
   - Reconstruct state from events

5. **Dead Letter Queue**
   - Handle failed event processing
   - Retry mechanism

---

## Testing Events

### Test PostCreated

```bash
# Terminal 1: Watch Query Service console for event
# Terminal 2: Create post
curl -X POST http://localhost:5000/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Post"}'

# Terminal 3: Verify in Query Service
curl http://localhost:5002/posts
```

### Test CommentCreated

```bash
# Get a post ID from Query Service first
curl http://localhost:5002/posts

# Then create a comment for that post
curl -X POST http://localhost:5001/posts/<POST_ID>/comments \
  -H "Content-Type: application/json" \
  -d '{"content":"Test comment"}'

# Verify comment was added
curl http://localhost:5002/posts
```

---

This event-driven architecture provides a solid foundation for building scalable microservices! 🚀
