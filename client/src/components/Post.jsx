import { CommentsList } from './CommentsList'
import { CreateComment } from './CreateComment'
import '../styles/Post.css'

export function Post({ post, comments, isExpanded, onExpandedChange, onAddComment }) {
    return (
        <div className={`post-card ${isExpanded ? 'expanded' : ''}`}>
            <div className="post-header">
                <div className="post-title-wrapper">
                    <h3 className="post-title">{post.title}</h3>
                    <span className="post-meta">{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
                </div>
                <button
                    className="expand-btn"
                    onClick={() => onExpandedChange(!isExpanded)}
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                    {isExpanded ? '✕' : '+'}
                </button>
            </div>

            {isExpanded && (
                <div className="post-content">
                    <CommentsList comments={comments} />
                    <CreateComment postId={post.id} onAddComment={onAddComment} />
                </div>
            )}
        </div>
    )
}
