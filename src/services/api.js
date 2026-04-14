// API client with error handling and interceptors
import axios from 'axios'

const API_BASE_URL = '/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    const message = error.response?.data?.message || error.message || 'An error occurred'
    return Promise.reject({
      status: error.response?.status,
      message,
      originalError: error
    })
  }
)

export const storiesAPI = {
  // List all stories
  getAll: async () => {
    const { data } = await apiClient.get('/stories')
    return data
  },

  // Get single story with all pages
  getById: async (id) => {
    const { data } = await apiClient.get(`/stories/${id}`)
    return data
  },

  // Create new story
  create: async (storyData) => {
    const { data } = await apiClient.post('/stories', storyData)
    return data
  },

  // Update story
  update: async (id, storyData) => {
    const { data } = await apiClient.put(`/stories/${id}`, storyData)
    return data
  },

  // Delete story
  delete: async (id) => {
    const { data } = await apiClient.delete(`/stories/${id}`)
    return data
  }
}

export default apiClient
