import { useState, useEffect } from 'react'
import { CreatePost } from './components/CreatePost'
import { PostsList } from './components/PostsList'
import './styles/App.css'

const QUERY_SERVICE_URL = 'http://localhost:5002'
const POSTS_SERVICE_URL = 'http://localhost:5000'
const COMMENTS_SERVICE_URL = 'http://localhost:5001'

function App() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch posts with comments from Query Service
  const fetchPosts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`${QUERY_SERVICE_URL}/posts`)
      if (!response.ok) throw new Error('Failed to fetch posts')
      const data = await response.json()
      setPosts(data || [])
    } catch (err) {
      console.error('Error fetching posts:', err)
      setError('Failed to load posts. Make sure all services are running.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch posts on component mount and set up polling
  useEffect(() => {
    fetchPosts()
    // Poll for updates every 2 seconds
    const interval = setInterval(fetchPosts, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleAddPost = async (title) => {
    try {
      const response = await fetch(`${POSTS_SERVICE_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (!response.ok) throw new Error('Failed to create post')
      // Wait a moment for the event to propagate, then fetch
      setTimeout(fetchPosts, 500)
    } catch (err) {
      console.error('Error creating post:', err)
      setError('Failed to create post')
    }
  }

  const handleAddComment = async (postId, content) => {
    try {
      const response = await fetch(`${COMMENTS_SERVICE_URL}/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!response.ok) throw new Error('Failed to create comment')
      // Wait a moment for the event to propagate, then fetch
      setTimeout(fetchPosts, 500)
    } catch (err) {
      console.error('Error creating comment:', err)
      setError('Failed to create comment')
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Blog Hub</h1>
        <p className="app-subtitle">Share your thoughts and connect with others</p>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="app-content">
        <CreatePost onAddPost={handleAddPost} />
        {loading ? (
          <div className="loading-spinner">Loading posts...</div>
        ) : (
          <PostsList
            posts={posts}
            onAddComment={handleAddComment}
          />
        )}
      </div>
    </div>
  )
}

export default App
