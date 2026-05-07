import { useState } from 'react'
import '../styles/CreatePost.css'

export function CreatePost({ onAddPost }) {
    const [title, setTitle] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (title.trim()) {
            setIsLoading(true)
            try {
                await onAddPost(title)
                setTitle('')
            } finally {
                setIsLoading(false)
            }
        }
    }

    return (
        <form className="create-post-container" onSubmit={handleSubmit}>
            <div className="create-post">
                <h2 className="create-post-title">Create Post</h2>
                <div className="form-group">
                    <label htmlFor="post-title">Title</label>
                    <input
                        id="post-title"
                        type="text"
                        className="post-input"
                        placeholder="Enter your post title..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={isLoading}
                    />
                </div>
                <button
                    type="submit"
                    className="submit-btn"
                    disabled={isLoading || !title.trim()}
                >
                    {isLoading ? 'Posting...' : 'Submit'}
                </button>
            </div>
        </form>
    )
}
