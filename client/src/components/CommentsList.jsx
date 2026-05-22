import '../styles/CommentsList.css'

export function CommentsList({ comments }) {
    const getStatusLabel = (status) => {
        if (status === 'accepted') {
            return 'Accepted'
        }

        if (status === 'rejected') {
            return 'Rejected'
        }

        return 'Pending'
    }

    const getCommentText = (comment) => {
        if (comment.status === 'rejected') {
            return 'Comment rejected'
        }

        return `- ${comment.content}`
    }

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
                    <li key={comment.id} className={`comment-item ${comment.status || 'pending'}`}>
                        <span className="comment-text">{getCommentText(comment)}</span>
                        <span className="comment-status">{getStatusLabel(comment.status)}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
