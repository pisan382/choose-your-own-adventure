import Header from '../components/Header'
import AuthorForm from '../components/AuthorForm'
import Breadcrumbs from '../components/Breadcrumbs'
import { ACCESSIBILITY } from '../constants'

export default function Author() {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 min-h-screen flex flex-col">
      <Header />

      {/* Main Content */}
      <main id={ACCESSIBILITY.MAIN_CONTENT_ID} className="flex-grow">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Breadcrumbs items={[
            { label: 'Home', href: '/' },
            { label: 'Create Story' }
          ]} />

          <div className="mt-8">
            <AuthorForm />
          </div>
        </div>
      </main>
    </div>
  )
}
