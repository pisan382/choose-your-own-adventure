// Custom hooks for managing stories
import { useState, useCallback } from 'react'
import { storiesAPI } from './api'

/**
 * Hook for fetching stories
 * Provides loading, error, and data states
 */
export const useStories = () => {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchStories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await storiesAPI.getAll()
      setStories(data)
    } catch (err) {
      setError(err.message || 'Failed to fetch stories')
    } finally {
      setLoading(false)
    }
  }, [])

  return { stories, loading, error, fetchStories, setStories }
}

/**
 * Hook for fetching a single story
 * Provides loading, error, and data states
 */
export const useStory = (id) => {
  const [story, setStory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchStory = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await storiesAPI.getById(id)
      setStory(data)
    } catch (err) {
      setError(err.message || 'Failed to fetch story')
    } finally {
      setLoading(false)
    }
  }, [id])

  return { story, loading, error, fetchStory }
}

/**
 * Hook for managing form state and validation
 */
export const useForm = (initialValues, onSubmit) => {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = useCallback(e => {
    const { name, value } = e.target
    setValues(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }, [errors])

  const handleBlur = useCallback(e => {
    const { name } = e.target
    setTouched(prev => ({
      ...prev,
      [name]: true
    }))
  }, [])

  const handleSubmit = useCallback(async e => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit(values)
    } catch (err) {
      setErrors(prev => ({
        ...prev,
        submit: err.message || 'An error occurred'
      }))
    } finally {
      setIsSubmitting(false)
    }
  }, [values, onSubmit])

  const resetForm = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }, [initialValues])

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setValues,
    setErrors
  }
}
