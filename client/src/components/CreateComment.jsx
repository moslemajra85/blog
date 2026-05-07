import { useState } from 'react'
import '../styles/CreateComment.css'

export function CreateComment({ postId, onAddComment }) {
    const [content, setContent] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (content.trim()) {
            setIsLoading(true)
            try {
                await onAddComment(postId, content)
                setContent('')
            } finally {
                setIsLoading(false)
            }
        }
    }

    return (
        <form className="create-comment-form" onSubmit={handleSubmit}>
            <input
                type="text"
                className="comment-input"
                placeholder="Add a comment..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isLoading}
            />
            <button
                type="submit"
                className="submit-comment-btn"
                disabled={isLoading || !content.trim()}
            >
                {isLoading ? '...' : 'Submit'}
            </button>
        </form>
    )
}
