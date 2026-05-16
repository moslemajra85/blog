import { useCallback, useEffect, useState } from 'react'
import { CreatePost } from './components/CreatePost'
import { PostsList } from './components/PostsList'
import './styles/App.css'

const QUERY_SERVICE_URL = 'http://localhost:4002'
const POSTS_SERVICE_URL = 'http://localhost:4000'
const COMMENTS_SERVICE_URL = 'http://localhost:4001'

const parseErrorMessage = async (response, fallbackMessage) => {
  try {
    const body = await response.json()
    return body?.error || fallbackMessage
  } catch {
    return fallbackMessage
  }
}

function App() {
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedPostId, setExpandedPostId] = useState(null)

  const fetchPosts = useCallback(() => {
    return fetch(`${QUERY_SERVICE_URL}/posts`)
      .then(async (response) => {
        if (!response.ok) {
          const message = await parseErrorMessage(response, 'Failed to load posts')
          throw new Error(message)
        }

        return response.json()
      })
      .then((data) => {
        setPosts(Array.isArray(data) ? data : [])
        setError(null)
      })
      .catch((err) => {
        console.error('Error fetching posts:', err)
        setError('Could not load posts. Make sure the query service is running on port 4002.')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchPosts()

    const pollingId = setInterval(() => {
      fetchPosts()
    }, 2000)

    return () => clearInterval(pollingId)
  }, [fetchPosts])

  const handleAddPost = async (title) => {
    try {
      const response = await fetch(`${POSTS_SERVICE_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })

      if (!response.ok) {
        const message = await parseErrorMessage(response, 'Failed to create post')
        throw new Error(message)
      }

      const createdPost = await response.json()
      setExpandedPostId(createdPost.id)
      await fetchPosts()
    } catch (err) {
      console.error('Error creating post:', err)
      setError(err.message || 'Could not create post.')
    }
  }

  const handleAddComment = async (postId, content) => {
    try {
      const response = await fetch(`${COMMENTS_SERVICE_URL}/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        const message = await parseErrorMessage(response, 'Failed to create comment')
        throw new Error(message)
      }

      setExpandedPostId(postId)
      await fetchPosts()
    } catch (err) {
      console.error('Error creating comment:', err)
      setError(err.message || 'Could not create comment.')
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
        {isLoading ? (
          <div className="loading-spinner">Loading posts...</div>
        ) : (
          <PostsList
            posts={posts}
            expandedPostId={expandedPostId}
            onExpandedChange={setExpandedPostId}
            onAddComment={handleAddComment}
          />
        )}
      </div>
    </div>
  )
}

export default App
