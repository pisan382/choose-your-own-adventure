import { createContext, useContext, useState, useEffect } from 'react'

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Always default to dark on first visit; respect saved preference after
    return localStorage.getItem('cyoa-theme') || 'dark'
  })
  const [edgeStyle, setEdgeStyle] = useState(() => {
    return localStorage.getItem('cyoa-edge-style') || 'default'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '')
    localStorage.setItem('cyoa-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('cyoa-edge-style', edgeStyle)
  }, [edgeStyle])

  return (
    <SettingsContext.Provider value={{ theme, setTheme, edgeStyle, setEdgeStyle }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
