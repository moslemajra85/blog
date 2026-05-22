# Infrastructure and Database Plan

This document explains the recommended infrastructure direction for the blog microservice app.

The current app is a learning-focused event-driven system with these services:

- `client`: React/Vite frontend
- `posts`: creates and lists posts
- `comments`: creates comments and updates moderation status
- `moderation`: decides whether comments are accepted or rejected
- `query`: builds the read model used by the frontend
- `event-bus`: broadcasts events between services

Right now, backend data is stored in memory. That is useful for learning event flow, but it means every restart deletes posts, comments, query state, and event history.

## Recommended Solution

Use Docker Compose for local infrastructure and PostgreSQL for persistence.

For this project, the best practical setup is:

- One Docker Compose file that runs every service.
- One PostgreSQL container for local development.
- Separate databases or schemas for service-owned data.
- Prisma as the ORM/migration tool for services that own relational data.
- Environment variables for ports, service URLs, and database URLs.
- Keep the current HTTP event bus for the next step, but design the infrastructure so it can later be replaced by NATS, RabbitMQ, or Kafka.

This gives us production-minded habits without overcomplicating the project too early.

## Why PostgreSQL

PostgreSQL is the right default database here because:

- Posts and comments are relational data.
- We need durable storage across restarts.
- It supports constraints, indexes, transactions, migrations, and JSON when needed.
- It works well with Node.js and Prisma.
- It is easy to run locally with Docker Compose.

Avoid MongoDB for this project unless the data model becomes document-heavy. Posts, comments, moderation status, and read models fit PostgreSQL cleanly.

## Should We Use an ORM?

Yes, use Prisma for the `posts`, `comments`, and probably `query` services.

Prisma is helpful here because it gives us:

- A clear schema file per service.
- Database migrations instead of manual SQL drift.
- Type-safe query APIs.
- Easier onboarding while the project grows.

Do not use Prisma for every service blindly.

Recommended usage:

- `posts`: use Prisma.
- `comments`: use Prisma.
- `query`: use Prisma if we persist the read model.
- `event-bus`: can use Prisma only if we persist an event log.
- `moderation`: no database needed right now.
- `client`: no database access.

The key rule is service ownership: a service should only write to its own database tables. Other services learn about changes through events.

## Target Architecture

```mermaid
flowchart LR
  Client[React Client] --> Posts[Posts Service]
  Client --> Comments[Comments Service]
  Client --> Query[Query Service]

  Posts --> Postgres[(PostgreSQL)]
  Comments --> Postgres
  Query --> Postgres

  Posts --> EventBus[HTTP Event Bus]
  Comments --> EventBus
  Moderation[Moderation Service] --> EventBus

  EventBus --> Posts
  EventBus --> Comments
  EventBus --> Query
  EventBus --> Moderation
```

The frontend calls command services for writes and the query service for reads. Write services persist their own data, then publish events. The query service consumes events and stores a read-optimized version of posts with comments.

The important limitation is that the current event bus is still not a production-grade message broker. Docker and PostgreSQL improve deployment and persistence, but they do not guarantee durable event delivery by themselves.

## Database Ownership

Use this ownership model:

| Service | Owns | Database Need |
| --- | --- | --- |
| `posts` | Post records | Required |
| `comments` | Comment records and moderation status | Required |
| `query` | Read model for frontend | Recommended |
| `event-bus` | Optional event log | Optional now, useful later |
| `moderation` | No long-term state | Not needed now |
| `client` | UI state only | Not needed |

For local development, use one PostgreSQL container with multiple logical databases:

- `posts_db`
- `comments_db`
- `query_db`
- `event_bus_db` later if we persist events

In a stricter production setup, each service would have its own database instance or managed database. For this project stage, one PostgreSQL container with separate databases is a good compromise.

## Proposed Data Models

### Posts Service

```prisma
model Post {
  id        String   @id
  title     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Comments Service

```prisma
model Comment {
  id        String   @id
  postId    String
  content   String
  status    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([postId])
}
```

Do not create a foreign key from `comments.postId` to `posts.id` across service databases. In microservices, the comments service should not depend directly on the posts database.

### Query Service

For the query service, keep a denormalized read model:

```prisma
model QueryPost {
  id        String         @id
  title     String
  comments  QueryComment[]
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
}

model QueryComment {
  id        String    @id
  postId    String
  content   String
  status    String
  post      QueryPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([postId])
}
```

This duplicates data from `posts` and `comments`, but that is the point of the query service. It serves the frontend efficiently without forcing the frontend to call multiple services and join data itself.

## Dockerization Plan

### 1. Add a Dockerfile to each Node service

Each backend service should have a small Dockerfile:

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 4000

CMD ["npm", "start"]
```

Change `EXPOSE` per service:

- `posts`: `4000`
- `comments`: `4001`
- `query`: `4002`
- `event-bus`: `4003`
- `moderation`: `4004`

For production later, replace `nodemon` with `node index.js` and move `nodemon` to `devDependencies`.

### 2. Add a Dockerfile for the client

For development, the client can run with Vite:

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

For production later, build static assets and serve them with Nginx or a small static server.

### 3. Add `docker-compose.yml`

The compose file should run:

- `postgres`
- `event-bus`
- `posts`
- `comments`
- `query`
- `moderation`
- `client`

Important Compose rules:

- Services should call each other by Compose service name, not `localhost`.
- `localhost` inside a container means that same container, not your host machine.
- Use environment variables for URLs and database connections.
- Use a named volume for PostgreSQL data.

Example service URLs inside Compose:

- `http://event-bus:4003`
- `http://posts:4000`
- `http://comments:4001`
- `http://query:4002`
- `http://moderation:4004`

### 4. Replace hardcoded URLs with environment variables

Current code uses values like:

```js
const EVENT_BUS_URL = "http://localhost:4003";
```

Change this pattern to:

```js
const EVENT_BUS_URL = process.env.EVENT_BUS_URL || "http://localhost:4003";
```

The event bus also needs configurable subscriber URLs:

```js
const serviceUrls = process.env.SERVICE_URLS
  ? process.env.SERVICE_URLS.split(",")
  : [
      "http://localhost:4000/events",
      "http://localhost:4001/events",
      "http://localhost:4002/events",
      "http://localhost:4004/events",
    ];
```

This keeps local non-Docker development working while allowing Docker networking.

### 5. Add health checks

Each backend already has `GET /health`. Docker Compose can use those endpoints to check service health.

This matters because `depends_on` only controls startup order. It does not guarantee that a service is ready to receive traffic.

### 6. Add Prisma to database-backed services

For each service that needs a database:

```bash
cd posts
npm install @prisma/client
npm install -D prisma
npx prisma init
```

Repeat for `comments` and `query`.

Each service should have its own:

- `prisma/schema.prisma`
- `DATABASE_URL`
- migrations
- generated Prisma client

### 7. Run migrations from containers

For local development, migrations can be run manually:

```bash
docker compose run --rm posts npx prisma migrate dev
docker compose run --rm comments npx prisma migrate dev
docker compose run --rm query npx prisma migrate dev
```

For production, use:

```bash
npx prisma migrate deploy
```

Do not use `migrate dev` in production.

## Example Compose Shape

This is the intended structure, not necessarily the final exact file:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: blog
      POSTGRES_PASSWORD: blog
      POSTGRES_DB: blog
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  event-bus:
    build: ./event-bus
    ports:
      - "4003:4003"
    environment:
      SERVICE_URLS: http://posts:4000/events,http://comments:4001/events,http://query:4002/events,http://moderation:4004/events

  posts:
    build: ./posts
    ports:
      - "4000:4000"
    environment:
      EVENT_BUS_URL: http://event-bus:4003
      DATABASE_URL: postgresql://blog:blog@postgres:5432/posts_db
    depends_on:
      - postgres
      - event-bus

  comments:
    build: ./comments
    ports:
      - "4001:4001"
    environment:
      EVENT_BUS_URL: http://event-bus:4003
      DATABASE_URL: postgresql://blog:blog@postgres:5432/comments_db
    depends_on:
      - postgres
      - event-bus

  query:
    build: ./query
    ports:
      - "4002:4002"
    environment:
      DATABASE_URL: postgresql://blog:blog@postgres:5432/query_db
    depends_on:
      - postgres
      - event-bus

  moderation:
    build: ./moderation
    ports:
      - "4004:4004"
    environment:
      EVENT_BUS_URL: http://event-bus:4003
    depends_on:
      - event-bus

  client:
    build: ./client
    ports:
      - "5173:5173"
    depends_on:
      - posts
      - comments
      - query

volumes:
  postgres_data:
```

One issue with this exact example: PostgreSQL creates only `POSTGRES_DB` automatically. To use multiple databases like `posts_db`, `comments_db`, and `query_db`, add an initialization script under something like `infra/postgres/init.sql`.

Example:

```sql
CREATE DATABASE posts_db;
CREATE DATABASE comments_db;
CREATE DATABASE query_db;
```

Then mount it:

```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
  - ./infra/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
```

## Event Reliability Plan

The current HTTP event bus stores events in memory and broadcasts by HTTP. That means:

- Events are lost if the event bus restarts.
- A service can miss events while it is down.
- There is no retry queue.
- There is no dead-letter queue.
- There is no durable consumer offset.

For the next infrastructure step, keep the current event bus because it is good for learning.

For a stronger version, replace it later with:

- NATS if we want a lightweight broker.
- RabbitMQ if we want queues, retries, and routing.
- Kafka if we want durable event streams and replay at scale.

For this project, RabbitMQ or NATS would be more reasonable than Kafka. Kafka is powerful, but it would be unnecessary complexity right now.

## Implementation Phases

### Phase 1: Dockerize without changing behavior

Goal: run the existing app with one command.

Tasks:

- Add Dockerfiles for all services.
- Add `docker-compose.yml`.
- Replace hardcoded service URLs with environment variables.
- Keep in-memory storage temporarily.
- Verify app works through Docker Compose.

Acceptance criteria:

- `docker compose up --build` starts the full app.
- Client is available at `http://localhost:5173`.
- Creating posts and comments still works.
- Moderation still accepts/rejects comments.
- Health endpoints respond from containers.

### Phase 2: Add PostgreSQL and Prisma

Goal: persist data across service restarts.

Tasks:

- Add PostgreSQL service to Compose.
- Add database initialization script.
- Add Prisma to `posts`.
- Add Prisma to `comments`.
- Add Prisma to `query`.
- Create migrations.
- Replace in-memory objects with database queries.
- Keep the same public APIs.

Acceptance criteria:

- Posts survive a `posts` service restart.
- Comments survive a `comments` service restart.
- Query read model survives a `query` service restart.
- Existing frontend behavior does not change.

### Phase 3: Improve startup and operational behavior

Goal: make local infrastructure less fragile.

Tasks:

- Add Compose health checks.
- Add database readiness handling.
- Add structured environment examples.
- Add a root-level `README` section for Docker usage.
- Add basic service logs that include service name and event type.

Acceptance criteria:

- Services do not crash permanently just because PostgreSQL starts slowly.
- A new developer can run the app from the root directory.
- Logs make it clear which service handled which event.

### Phase 4: Improve event reliability

Goal: reduce lost-event risk.

Options:

- Short-term: persist event bus events in PostgreSQL.
- Better long-term: replace the HTTP event bus with RabbitMQ or NATS.

Acceptance criteria:

- If one consumer is temporarily down, events can still be delivered later.
- Failed event delivery is visible in logs or a dead-letter mechanism.
- Event handlers are idempotent, so replaying an event does not duplicate data.

## Important Engineering Notes

### Keep service databases separate

Do not let `comments` directly query the `posts` database. That makes the services tightly coupled and breaks the point of this architecture.

If `comments` needs to know whether a post exists, choose one of these:

- Let the client only create comments for posts it got from the query service.
- Have `comments` maintain a small local projection of known post IDs from `PostCreated` events.
- Accept eventual consistency and handle invalid post IDs at the application level.

### Make event handlers idempotent

Event handlers should tolerate receiving the same event more than once.

For example, when the query service handles `PostCreated`, it should upsert the post by ID instead of blindly inserting.

This matters because reliable event systems often retry delivery.

### Keep API behavior stable

The frontend should not need to know whether the backend uses memory or PostgreSQL.

The migration should preserve:

- `GET /posts`
- `POST /posts`
- `GET /posts/:id/comments`
- `POST /posts/:id/comments`

### Do not add Kubernetes yet

Kubernetes is not the right next step for this project.

Docker Compose is enough for local multi-service development. Kubernetes becomes useful later when we need deployment orchestration, scaling policies, secrets management, ingress, and production operations.

## Recommended Next Step

Start with Phase 1.

Dockerize the existing services first, while keeping behavior unchanged. After the app runs reliably through Docker Compose, add PostgreSQL and Prisma service by service.

This order is safer because it separates infrastructure problems from persistence problems. If Docker and database changes are done at the same time, debugging failures becomes harder.
