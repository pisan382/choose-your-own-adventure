import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStories } from '../services/hooks'
import LoadingSpinner from './LoadingSpinner'
import ErrorMessage from './ErrorMessage'

export default function StoryList() {
  const navigate = useNavigate()
  const { stories, loading, error, setStories } = useStories()

  useEffect(() => {
    loadStories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadStories = async () => {
    try {
      // Mock data for now - replace with real API call
      const mockStories = [
        {
          id: '1',
          title: 'The Cave of Time',
          author: 'Choose Your Own Adventure',
          description: 'A mysterious cave holds secrets from the past...',
          status: 'published',
          createdAt: new Date().toISOString(),
          pageCount: 4
        },
        {
          id: '2',
          title: 'Lost in the Forest',
          author: 'Adventure Writer',
          description: 'You wake up in an ancient forest with no memory...',
          status: 'draft',
          createdAt: new Date().toISOString(),
          pageCount: 7
        },
        {
          id: '3',
          title: 'Space Odyssey',
          author: 'Sci-Fi Enthusiast',
          description: 'Your spaceship crashes on an alien planet.',
          status: 'published',
          createdAt: new Date().toISOString(),
          pageCount: 5
        }
      ]
      setStories(mockStories)
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return <LoadingSpinner label="Loading stories..." />
  }

  if (error) {
    return (
      <ErrorMessage
        error={error}
        onRetry={loadStories}
        onDismiss={() => navigate('/')}
      />
    )
  }

  if (stories.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg">
        <div className="mb-4 text-4xl">📖</div>
        <p className="text-gray-600 mb-6 text-lg">No stories yet. Be the first to create one!</p>
        <button
          onClick={() => navigate('/author')}
          className="inline-block px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 font-semibold transition"
        >
          ✎ Create First Story
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">
          Featured Stories ({stories.length})
        </h2>
        <button
          onClick={loadStories}
          className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded px-2"
          aria-label="Refresh story list"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="region" aria-label="Stories">
        {stories.map(story => {
          // Pick a placeholder image based on story id
          const images = {
            '1': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80', // Cave
            '2': 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80', // Forest
            '3': 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=400&q=80', // Space
          }
          const imgUrl = images[story.id] || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'
          
          return (
            <article
              key={story.id}
              className="bg-gradient-to-br from-white via-purple-50 to-blue-50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col h-full border-2 border-purple-200 p-6 items-center justify-center text-center group transform hover:scale-105 hover:-translate-y-2"
            >
              <div className="relative">
                <img
                  src={imgUrl}
                  alt="Story cover"
                  className="rounded-2xl shadow-lg w-28 h-28 object-cover mb-3 mx-auto border-2 border-purple-300 transition-transform duration-300 ease-in-out group-hover:scale-110"
                />
              </div>
              <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 w-full mb-1">{story.title}</h3>
              <p className="text-base text-gray-700 mb-1 w-full font-semibold">
                by <span className="font-bold text-purple-600">{story.author}</span>
              </p>
              {story.description && (
                <p className="text-base text-gray-600 mb-2 w-full italic">{story.description}</p>
              )}
              <div className="flex items-center justify-center text-sm text-gray-600 mb-4 gap-2 w-full font-medium">
                <span>
                  <span role="img" aria-label="Pages">📄</span> {story.pageCount || 0} pages
                </span>
                <span className="text-purple-400">•</span>
                <time dateTime={story.createdAt}>
                  {new Date(story.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric'
                  })}
                </time>
              </div>
              <button
                onClick={() => navigate(`/read/${story.id}`)}
                className="w-72 max-w-full px-12 py-8 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full text-3xl shadow-lg hover:shadow-2xl hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-purple-400 focus:ring-offset-2 font-black transition-all duration-300 text-center mb-3 transform hover:scale-110 hover:-translate-y-1"
                aria-label={`Read story: ${story.title}`}
              >
                📖 Read
              </button>
              <button
                onClick={() => {
                  // TODO: Implement edit functionality
                  alert('Edit coming soon!')
                }}
                className="w-72 max-w-full px-12 py-8 bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 rounded-full text-3xl shadow-lg hover:shadow-2xl hover:from-gray-400 hover:to-gray-500 focus:outline-none focus:ring-4 focus:ring-gray-300 focus:ring-offset-2 font-black transition-all duration-300 text-center transform hover:scale-110 hover:-translate-y-1"
                aria-label={`Edit story: ${story.title}`}
                disabled
              >
                ✎ Edit
              </button>
            </article>
          )
        })}
      </div>
    </div>
  )
}
