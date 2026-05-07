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
    │   (5000)     │ │   (5001)     │ │   (5002)     │
    └──────┬───────┘ └──────┬───────┘ └──────▲───────┘
           │                │                │
           └────────────────┼────────────────┘
                            │
                      ┌─────▼──────┐
                      │  Event Bus  │
                      │   (4005)    │
                      └─────▲──────┘
                      Broadcasting
```

## 🚀 Quick Start Guide

### 1. Terminal 1: Event Bus (START FIRST!)

```bash
cd /home/moslem/Documents/blog/event-bus
npm start
```

Expected output: `Event Bus is running on port 4005`

### 2. Terminal 2: Posts Service

```bash
cd /home/moslem/Documents/blog/posts
npm start
```

Expected output: `Posts Service is running on port 5000`

### 3. Terminal 3: Comments Service

```bash
cd /home/moslem/Documents/blog/comments
npm start
```

Expected output: `Comments Service is running on port 5001`

### 4. Terminal 4: Query Service

```bash
cd /home/moslem/Documents/blog/query
npm start
```

Expected output: `Query Service is running on port 5002`

### 5. Terminal 5: React Client

```bash
cd /home/moslem/Documents/blog/client
npm run dev
```

Expected output: Open `http://localhost:5173` in your browser

---

## 📊 Data Flow

### Creating a Post

```
Client → POST /posts (5000)
   → PostCreated event → Event Bus → Query Service
   → Client polls /posts (5002) → Display
```

### Creating a Comment

```
Client → POST /posts/:id/comments (5001)
   → CommentCreated event → Event Bus → Query Service
   → Client polls /posts (5002) → Display
```

### Fetching Data

```
Client → GET /posts (5002) ← Query Service (has all data)
```

---

## 🔌 API Endpoints

### Posts Service (5000)

- `GET /posts` - Get all posts
- `POST /posts` - Create new post
  ```json
  { "title": "My Post" }
  ```

### Comments Service (5001)

- `GET /posts/:postId/comments` - Get comments for a post
- `POST /posts/:postId/comments` - Create new comment
  ```json
  { "content": "My comment" }
  ```

### Query Service (5002)

- `GET /posts` - Get all posts with their comments
  ```json
  [
    {
      "id": "abc123",
      "title": "My Post",
      "comments": [{ "id": "xyz789", "postId": "abc123", "content": "Great!" }]
    }
  ]
  ```

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
- Kill any processes on ports 4005, 5000, 5001, 5002, 5173

### Event Bus errors

- Always start Event Bus first (port 4005)
- Check console logs for failed POST attempts

### Client can't connect

- Verify all backend services are running
- Open browser DevTools → Console for CORS errors
- Check network tab to see requests to localhost:5002

### No posts showing

- Check that Query Service received events in console
- Verify Event Bus is broadcasting to Query Service
- Try refreshing the page

---

## 📝 Example Commands

### Create a post

```bash
curl -X POST http://localhost:5000/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello World"}'
```

### Get all posts

```bash
curl http://localhost:5000/posts
```

### Add a comment (replace with actual post ID)

```bash
curl -X POST http://localhost:5001/posts/abc123/comments \
  -H "Content-Type: application/json" \
  -d '{"content":"Nice post!"}'
```

### Get posts with comments

```bash
curl http://localhost:5002/posts
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
| Posts     | 5000 | Create & list posts              |
| Comments  | 5001 | Create & list comments           |
| Query     | 5002 | Aggregate data & serve to client |
| Event Bus | 4005 | Route events between services    |
| Client    | 5173 | React UI                         |

---

Ready to go! Start with the Event Bus and follow the quick start guide above. 🚀
