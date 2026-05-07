import { useState } from 'react'
import { CommentsList } from './CommentsList'
import { CreateComment } from './CreateComment'
import '../styles/Post.css'

export function Post({ post, comments, onAddComment }) {
    const [expanded, setExpanded] = useState(false)

    return (
        <div className={`post-card ${expanded ? 'expanded' : ''}`}>
            <div className="post-header">
                <div className="post-title-wrapper">
                    <h3 className="post-title">{post.title}</h3>
                    <span className="post-meta">{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
                </div>
                <button
                    className="expand-btn"
                    onClick={() => setExpanded(!expanded)}
                    aria-label={expanded ? 'Collapse' : 'Expand'}
                >
                    {expanded ? '✕' : '+'}
                </button>
            </div>

            {expanded && (
                <div className="post-content">
                    <CommentsList comments={comments} />
                    <CreateComment postId={post.id} onAddComment={onAddComment} />
                </div>
            )}
        </div>
    )
}
