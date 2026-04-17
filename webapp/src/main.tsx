import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './styles.css'
import App from './App'
import Home from './routes/Home'
import BookReader from './routes/BookReader'
import BookGraph from './routes/BookGraph'
import BookEndings from './routes/BookEndings'
import BookOverview from './routes/BookOverview'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'b/:slug', element: <BookOverview /> },
      { path: 'b/:slug/read', element: <BookReader /> },
      { path: 'b/:slug/read/:page', element: <BookReader /> },
      { path: 'b/:slug/graph', element: <BookGraph /> },
      { path: 'b/:slug/endings', element: <BookEndings /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
