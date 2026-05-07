# Blog Microservice Architecture

## Services Overview

This blog application uses a microservice architecture with 4 backend services and a React client.

### Services

1. **Posts Service** (Port 5000)
   - Manages post creation and listing
   - Emits `PostCreated` events
   - Endpoint: `GET/POST /posts`

2. **Comments Service** (Port 5001)
   - Manages comment creation and listing
   - Emits `CommentCreated` events
   - Endpoints: `GET/POST /posts/:id/comments`

3. **Query Service** (Port 5002)
   - Aggregates posts with their comments
   - Listens to events from Event Bus
   - Endpoint: `GET /posts` (returns posts with comments)

4. **Event Bus** (Port 4005)
   - Routes events between services
   - Broadcasts events to all registered services

5. **React Client** (Port 5173)
   - Frontend application
   - Fetches data from Query Service

## Setup Instructions

### Prerequisites

- Node.js installed
- All services have dependencies installed

### Step 1: Install Dependencies

```bash
# From the blog directory, install dependencies for all services

# Posts service
cd posts
npm install

# Comments service
cd ../comments
npm install

# Event Bus service
cd ../event-bus
npm install

# Query service
cd ../query
npm install

# Client app
cd ../client
npm install
```

### Step 2: Start All Services

Open 5 terminal windows and run each service:

**Terminal 1 - Event Bus (must start first)**

```bash
cd /home/moslem/Documents/blog/event-bus
npm start
```

**Terminal 2 - Posts Service**

```bash
cd /home/moslem/Documents/blog/posts
npm start
```

**Terminal 3 - Comments Service**

```bash
cd /home/moslem/Documents/blog/comments
npm start
```

**Terminal 4 - Query Service**

```bash
cd /home/moslem/Documents/blog/query
npm start
```

**Terminal 5 - React Client**

```bash
cd /home/moslem/Documents/blog/client
npm run dev
```

## How It Works

### Creating a Post

1. User enters post title in the React client
2. Client sends POST request to Posts Service (`localhost:5000/posts`)
3. Posts Service creates post and emits `PostCreated` event to Event Bus
4. Event Bus broadcasts event to all services
5. Query Service receives event and stores post in its internal data structure
6. Client polls Query Service for updated data

### Creating a Comment

1. User enters comment in the React client
2. Client sends POST request to Comments Service (`localhost:5001/posts/:postId/comments`)
3. Comments Service creates comment and emits `CommentCreated` event to Event Bus
4. Event Bus broadcasts event to all services
5. Query Service receives event and associates comment with post
6. Client polls Query Service for updated data

### Fetching Posts

1. React client requests `GET http://localhost:5002/posts`
2. Query Service returns all posts with their associated comments
3. Client displays the data

## Data Flow Diagram

```
React Client
    ↓
    ├─→ Posts Service (5000) ──→ Event Bus (4005) ──→ Query Service (5002)
    ├─→ Comments Service (5001) ──→ Event Bus (4005) ──→ Query Service (5002)
    ↓
Query Service (5002) ──→ Back to Client
```

## Environment Variables

All services use hardcoded ports:

- Event Bus: 4005
- Posts Service: 5000
- Comments Service: 5001
- Query Service: 5002
- React Client: 5173 (Vite default)

## In-Memory Storage

All data is stored in memory and will be lost when services restart. For persistence, consider:

- Adding a database layer
- Implementing data persistence to files
- Using an external database

## Troubleshooting

### Services won't connect

- Ensure all services are running
- Start Event Bus first
- Check that ports 4005, 5000, 5001, 5002 are not in use

### Client can't fetch posts

- Verify Query Service is running on port 5002
- Check browser console for CORS errors
- Ensure Event Bus is running

### Events not being processed

- Check Event Bus console logs
- Verify all services are registered in the services list in Event Bus
- Ensure Event Bus listens on port 4005

## API Examples

### Create a Post

```bash
curl -X POST http://localhost:5000/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"My First Post"}'
```

### Get All Posts

```bash
curl http://localhost:5000/posts
```

### Create a Comment

```bash
curl -X POST http://localhost:5001/posts/<postId>/comments \
  -H "Content-Type: application/json" \
  -d '{"content":"Great post!"}'
```

### Get Posts with Comments

```bash
curl http://localhost:5002/posts
```
