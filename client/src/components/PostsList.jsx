import { Post } from './Post'
import '../styles/PostsList.css'

export function PostsList({ posts, expandedPostId, onExpandedChange, onAddComment }) {
    if (posts.length === 0) {
        return (
            <div className="posts-list">
                <div className="empty-state">
                    <p>No posts yet. Create one to get started!</p>
                </div>
            </div>
        )
    }

    return (
        <div className="posts-list">
            {posts.map((post) => (
                <Post
                    key={post.id}
                    post={post}
                    comments={post.comments || []}
                    isExpanded={expandedPostId === post.id}
                    onExpandedChange={(expanded) => onExpandedChange(expanded ? post.id : null)}
                    onAddComment={onAddComment}
                />
            ))}
        </div>
    )
}
