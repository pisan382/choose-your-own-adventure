import Header from '../components/Header'
import StoryList from '../components/StoryList'
import { ACCESSIBILITY } from '../constants'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 flex flex-col relative overflow-hidden">
      {/* Animated background elements - more translucent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <Header />

        {/* Main Content */}
        <main id={ACCESSIBILITY.MAIN_CONTENT_ID} className="flex-grow">
          {/* Hero Section */}
          <div className="max-w-6xl mx-auto px-4 py-16">
            <div className="text-center mb-16">
              <h1 className="text-6xl md:text-7xl font-black text-white mb-6 drop-shadow-lg">
                Choose Your Own Adventure
              </h1>
              <p className="text-2xl md:text-3xl text-blue-100 max-w-3xl mx-auto drop-shadow font-medium leading-relaxed">
                Create and explore interactive branching stories. 
                <span className="block mt-2">Each choice shapes your unique adventure.</span>
              </p>
              <div className="mt-8 flex justify-center gap-4">
                <div className="text-5xl animate-bounce" style={{ animationDelay: '0s' }}>📚</div>
                <div className="text-5xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</div>
                <div className="text-5xl animate-bounce" style={{ animationDelay: '0.4s' }}>🎭</div>
              </div>
            </div>

            {/* Story List */}
            <StoryList />
          </div>
        </main>
      </div>

      {/* Add animation styles */}
      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
