export const fakePosts = [
  {
    id: "post-1",
    title: "How the event bus keeps services decoupled",
    comments: [
      {
        id: "comment-1",
        postId: "post-1",
        content: "This makes the write services simpler to reason about.",
      },
      {
        id: "comment-2",
        postId: "post-1",
        content: "The query service can build a read model from these events.",
      },
    ],
  },
  {
    id: "post-2",
    title: "Why the client reads from the query service",
    comments: [
      {
        id: "comment-3",
        postId: "post-2",
        content: "The UI gets posts and comments in one request.",
      },
    ],
  },
  {
    id: "post-3",
    title: "Testing the blog UI before the backend is ready",
    comments: [],
  },
]
