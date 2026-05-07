import '../styles/CommentsList.css'

export function CommentsList({ comments }) {
    if (comments.length === 0) {
        return (
            <div className="comments-list">
                <p className="no-comments">No comments yet</p>
            </div>
        )
    }

    return (
        <div className="comments-list">
            <p className="comments-count">{comments.length} comment{comments.length !== 1 ? 's' : ''}</p>
            <ul className="comments">
                {comments.map((comment) => (
                    <li key={comment.id} className="comment-item">
                        <span className="comment-text">- {comment.content}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
