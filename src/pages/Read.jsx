import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import Header from '../components/Header'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import Breadcrumbs from '../components/Breadcrumbs'
import { ACCESSIBILITY } from '../constants'

export default function Read() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [story, setStory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const contentRef = useRef(null)

  useEffect(() => {
    // Simulate fetching story from API
    const loadStory = async () => {
      try {
        setLoading(true)
        // Mock data - replace with real API call
        const storiesData = {
          '1': {
            id: '1',
            title: 'The Cave of Time',
            author: 'Choose Your Own Adventure',
            content: 'You stand at the entrance of a mysterious cave...',
            pages: [
              {
                id: 1,
                content: 'You stand at the entrance of a mysterious cave. What do you do?',
                choices: [
                  { text: 'Enter the cave', next: 2 },
                  { text: 'Turn back', next: 3 }
                ]
              },
              {
                id: 2,
                content: 'You find a clear stream. The water is cold and refreshing.',
                choices: [
                  { text: 'Follow the stream downstream', next: 4 },
                  { text: 'Fill your water bottle and explore', next: 5 }
                ]
              },
              {
                id: 3,
                content: 'From the top, you spot a cabin in the distance with smoke rising from its chimney.',
                choices: [
                  { text: 'Head toward the cabin', next: 6 },
                  { text: 'Descend and explore more carefully', next: 5 }
                ]
              },
              {
                id: 4,
                content: 'The stream leads to a waterfall. It\'s beautiful but impassable.',
                choices: [
                  { text: 'Go back and try another route', next: 5 },
                  { text: 'Try to climb around it', next: 7 }
                ]
              },
              {
                id: 5,
                content: 'You wander deeper into the forest and eventually lose your way. THE END.',
                choices: []
              },
              {
                id: 6,
                content: 'You reach the cabin and find shelter. You\'re rescued! THE END.',
                choices: []
              },
              {
                id: 7,
                content: 'You slip on the wet rocks and wake up... in your own bed. It was all a dream! THE END.',
                choices: []
              }
            ]
          },
          '3': {
            id: '3',
            title: 'Space Odyssey',
            author: 'Sci-Fi Enthusiast',
            content: 'Your spaceship crashes on an alien planet...',
            pages: [
              {
                id: 1,
                content: 'Your spaceship crashes on an alien planet. The damage is severe. What\'s your priority?',
                choices: [
                  { text: 'Check life support systems', next: 2 },
                  { text: 'Explore outside the ship', next: 3 }
                ]
              },
              {
                id: 2,
                content: 'Life support is stable for 72 hours. You have time to figure this out.',
                choices: [
                  { text: 'Attempt to repair the communication array', next: 4 },
                  { text: 'Search for water and resources outside', next: 3 }
                ]
              },
              {
                id: 3,
                content: 'Outside, you discover bioluminescent plants and crystalline structures. Fascinating!',
                choices: [
                  { text: 'Collect samples for study', next: 5 },
                  { text: 'Follow a path deeper into the cavern', next: 6 }
                ]
              },
              {
                id: 4,
                content: 'Success! You send a distress signal and a rescue ship is en route! THE END.',
                choices: []
              },
              {
                id: 5,
                content: 'The samples are invaluable. Science wins! THE END.',
                choices: []
              },
              {
                id: 6,
                content: 'You discover an underground city of advanced aliens. First contact! THE END.',
                choices: []
              }
            ]
          }
        }
        
        const mockStory = storiesData[id]
        if (!mockStory) {
          setError('Story not found')
          return
        }
        setStory(mockStory)
      } catch (err) {
        setError(err.message || 'Failed to load story')
      } finally {
        setLoading(false)
      }
    }
    loadStory()
  }, [id])

  // Keyboard navigation: Arrow keys to navigate choices
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!story) return
      const page = story.pages?.find(p => p.id === currentPage)
      if (!page?.choices || page.choices.length === 0) return

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const buttons = contentRef.current?.querySelectorAll('[data-choice-button]')
        if (!buttons || buttons.length === 0) return

        const focusedElement = document.activeElement
        let currentIndex = Array.from(buttons).indexOf(focusedElement)

        if (currentIndex === -1) {
          currentIndex = e.key === 'ArrowUp' ? buttons.length - 1 : 0
        } else {
          if (e.key === 'ArrowDown') {
            currentIndex = (currentIndex + 1) % buttons.length
          } else {
            currentIndex = (currentIndex - 1 + buttons.length) % buttons.length
          }
        }
        buttons[currentIndex]?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [story, currentPage])

  const handlePageChange = (nextPageId) => {
    setCurrentPage(nextPageId)
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <LoadingSpinner label="Loading your adventure..." />
        </main>
      </div>
    )
  }

  if (error || !story) {
    return (
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center px-4">
          <div className="max-w-md w-full">
            <ErrorMessage
              error={error || 'Story not found'}
              onRetry={() => window.location.reload()}
              onDismiss={() => navigate('/')}
            />
          </div>
        </main>
      </div>
    )
  }

  const page = story.pages?.find(p => p.id === currentPage)
  const totalPages = story.pages?.length || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col">
      <Header />
      <main id={ACCESSIBILITY.MAIN_CONTENT_ID} className="flex-grow">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Breadcrumbs items={[
            { label: 'Home', href: '/' },
            { label: story.title }
          ]} />

          <div ref={contentRef} className="mt-8 bg-gradient-to-br from-white via-purple-50 to-blue-50 rounded-2xl shadow-2xl p-10 border-2 border-purple-200" role="main">
            <header className="mb-10 pb-8 border-b-2 border-purple-300">
              <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-3">{story.title}</h1>
              <p className="text-lg text-gray-700">by <span className="font-bold text-purple-600">{story.author}</span></p>
              <div className="mt-6 flex items-center justify-between text-base text-gray-600 font-semibold">
                <span>Page {currentPage} of {totalPages}</span>
                <div className="w-48 h-3 bg-gray-200 rounded-full overflow-hidden border-2 border-purple-300">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500" style={{ width: `${(currentPage / totalPages) * 100}%` }} aria-hidden="true" />
                </div>
              </div>
            </header>

            {page ? (
              <>
                {/* Decision page image */}
                <div className="flex justify-center mb-8 w-full">
                  <img
                    src={
                      story.id === '1'
                        ? 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'
                        : story.id === '2'
                        ? 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80'
                        : story.id === '3'
                        ? 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=400&q=80'
                        : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'
                    }
                    alt="Scene illustration"
                    className="rounded-2xl shadow-xl w-full max-w-md h-64 object-cover border-4 border-purple-300 transition-transform duration-300"
                  />
                </div>

                <article className="prose prose-sm max-w-none mb-10">
                  <p className="text-xl text-gray-800 leading-relaxed whitespace-pre-wrap font-medium">{page.content}</p>
                </article>

                {page.choices && page.choices.length > 0 ? (
                  <section className="mt-8 w-full flex flex-col items-center">
                    <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 uppercase tracking-wide text-center mb-6">What do you do?</h2>
                    <div className="flex flex-col gap-4 w-full max-w-2xl" role="group" aria-label="Story choices">
                      {page.choices.map((choice, idx) => (
                        <button
                          key={idx}
                          data-choice-button
                          onClick={() => handlePageChange(choice.next)}
                          className="w-full px-8 py-4 text-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full text-xl shadow-lg hover:shadow-2xl hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-purple-400 focus:ring-offset-2 font-bold transition-all duration-300 group border-2 border-purple-400"
                          aria-label={`Choice: ${choice.text}`}
                        >
                          <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">→ {choice.text}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-base text-gray-700 mt-6 font-semibold">💡 Use arrow keys (↑ ↓) to navigate choices</p>
                  </section>
                ) : (
                  <section className="mt-8 text-center py-12 bg-gradient-to-br from-purple-100 via-indigo-100 to-blue-100 rounded-2xl border-4 border-purple-300">
                    <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-4">✨ The End ✨</h2>
                    <p className="text-gray-800 mb-8 text-lg font-semibold">Thanks for reading <span className="font-black">{story.title}</span>!</p>
                    <div className="flex gap-6 justify-center flex-wrap">
                      <button onClick={() => navigate('/')} className="px-10 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full text-xl font-black shadow-lg hover:shadow-2xl hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-purple-400 focus:ring-offset-2 transition-all duration-300 border-2 border-purple-400">← Back to Stories</button>
                      <button onClick={() => setCurrentPage(1)} className="px-10 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-xl font-black shadow-lg hover:shadow-2xl hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-4 focus:ring-green-400 focus:ring-offset-2 transition-all duration-300 border-2 border-green-400">🔄 Start Over</button>
                    </div>
                  </section>
                )}
              </>
            ) : (
              <div className="text-center py-12"><p className="text-white text-lg font-semibold">Page not found</p></div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
