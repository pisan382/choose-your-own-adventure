// Application constants
export const ROUTES = {
  HOME: '/',
  AUTHOR: '/author',
  READ: '/read/:id',
  EDIT: '/edit/:id'
}

export const API_ENDPOINTS = {
  STORIES: '/api/stories',
  STORY: (id) => `/api/stories/${id}`
}

export const MESSAGES = {
  LOADING: 'Loading...',
  ERROR: 'Something went wrong. Please try again.',
  SUCCESS: 'Success!',
  STORY_NOT_FOUND: 'Story not found',
  NO_STORIES: 'No stories yet. Create one to get started!',
  STORY_CREATED: 'Story created successfully!',
  STORY_DELETED: 'Story deleted',
  CREATING_STORY: 'Creating story...',
  FETCHING_STORY: 'Loading story...'
}

export const VALIDATION = {
  TITLE_MIN: 3,
  TITLE_MAX: 100,
  AUTHOR_MIN: 2,
  AUTHOR_MAX: 50,
  CONTENT_MIN: 50,
  CONTENT_MAX: 5000
}

export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
}

export const ACCESSIBILITY = {
  SKIP_LINK_ID: 'skip-to-main',
  MAIN_CONTENT_ID: 'main-content',
  NAVIGATION_LABEL: 'Main navigation'
}
