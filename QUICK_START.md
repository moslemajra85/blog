# Blog Microservice Architecture - Quick Start

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    React Client (5173)                      │
└──────────┬──────────────┬──────────────┬────────────────────┘
           │              │              │
           ▼              ▼              ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │   Posts      │ │  Comments    │ │    Query     │
    │   Service    │ │   Service    │ │   Service    │
    │   (4000)     │ │   (4001)     │ │   (4002)     │
    └──────┬───────┘ └──────┬───────┘ └──────▲───────┘
           │                │                │
           └────────────────┼────────────────┘
                            │
                      ┌─────▼──────┐
                      │  Event Bus  │
                      │   (4003)    │
                      └─────▲──────┘
                      Broadcasting
```

## 🚀 Quick Start Guide

### 1. Terminal 1: Event Bus (START FIRST!)

```bash
cd /home/moslem/Documents/blog/event-bus
npm start
```

Expected output: `service running { port: 4003 }`

### 2. Terminal 2: Posts Service

```bash
cd /home/moslem/Documents/blog/posts
npm start
```

Expected output: `service running { port: 4000 }`

### 3. Terminal 3: Comments Service

```bash
cd /home/moslem/Documents/blog/comments
npm start
```

Expected output: `service running { port: 4001 }`

### 4. Terminal 4: Moderation Service

```bash
cd /home/moslem/Documents/blog/moderation
npm install
npm start
```

Expected output: `service running { port: 4004 }`

### 5. Terminal 5: Query Service

```bash
cd /home/moslem/Documents/blog/query
npm start
```

Expected output: `service running { port: 4002 }`

### 6. Terminal 6: React Client

```bash
cd /home/moslem/Documents/blog/client
npm run dev
```

Expected output: Open `http://localhost:5173` in your browser

---

## 📊 Data Flow

### Creating a Post

```
Client → POST /posts (4000)
   → PostCreated event → Event Bus → Query Service
   → Client polls /posts (4002) → Display
```

### Creating a Comment

```
Client → POST /posts/:id/comments (4001)
   → CommentCreated event → Event Bus → Moderation Service
   → CommentModerated event → Event Bus → Comments + Query Services
   → Client polls /posts (4002) → Display
```

### Fetching Data

```
Client → GET /posts (4002) ← Query Service (has all data)
```

---

## 🔌 API Endpoints

### Posts Service (4000)

- `GET /posts` - Get all posts
- `POST /posts` - Create new post
  ```json
  { "title": "My Post" }
  ```

### Comments Service (4001)

- `GET /posts/:postId/comments` - Get comments for a post
- `POST /posts/:postId/comments` - Create new comment
  ```json
  { "content": "My comment" }
  ```

### Query Service (4002)

- `GET /posts` - Get all posts with their comments
  ```json
  [
    {
      "id": "abc123",
      "title": "My Post",
      "comments": [
        {
          "id": "xyz789",
          "postId": "abc123",
          "content": "Great!",
          "status": "accepted"
        }
      ]
    }
  ]
  ```

### Moderation Service (4004)

- `POST /events` - Receives `CommentCreated` and emits `CommentModerated`
- Rejects comments containing `stupid`

---

## 🎯 Key Points

✅ **In-Memory Storage** - All data is stored in RAM (lost on restart)

✅ **Event-Driven** - Services communicate via events through Event Bus

✅ **Scalable** - Easy to add new services that listen to events

✅ **Decoupled** - Services don't directly call each other

✅ **Polling** - Client polls Query Service for updates every 2 seconds

---

## 🐛 Troubleshooting

### Services won't start

- Make sure you have Node.js installed
- Run `npm install` in each service directory
- Kill any processes on ports 4000, 4001, 4002, 4003, 4004, 5173

### Event Bus errors

- Always start Event Bus first (port 4003)
- Check console logs for failed POST attempts

### Client can't connect

- Verify all backend services are running
- Open browser DevTools → Console for CORS errors
- Check network tab to see requests to localhost:4002

### No posts showing

- Check that Query Service received events in console
- Verify Event Bus is broadcasting to Query Service
- Try refreshing the page

---

## 📝 Example Commands

### Create a post

```bash
curl -X POST http://localhost:4000/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello World"}'
```

### Get all posts

```bash
curl http://localhost:4000/posts
```

### Add a comment (replace with actual post ID)

```bash
curl -X POST http://localhost:4001/posts/abc123/comments \
  -H "Content-Type: application/json" \
  -d '{"content":"Nice post!"}'
```

### Get posts with comments

```bash
curl http://localhost:4002/posts
```

---

## 🎨 Client Features

- Beautiful gradient UI with smooth animations
- Real-time polling (2-second intervals)
- Create posts with titles
- Expand posts to see and add comments
- Responsive grid layout (3, 2, or 1 column based on screen size)
- Error messages for failed requests
- Loading indicators

---

## 📚 Services Summary

| Service   | Port | Responsibility                   |
| --------- | ---- | -------------------------------- |
| Posts | 4000 | Create & list posts |
| Comments | 4001 | Create & list comments and store moderation status |
| Query | 4002 | Aggregate data & serve to client |
| Event Bus | 4003 | Route events between services |
| Moderation | 4004 | Decide whether comments are accepted or rejected |
| Client    | 5173 | React UI                         |

---

Ready to go! Start with the Event Bus and follow the quick start guide above. 🚀
