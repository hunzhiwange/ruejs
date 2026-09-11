'use client'

import { createContext, useContext } from '@rue-js/rue'

const ThemeContext = createContext(null)

export function ThemeProvider({ theme, children }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const theme = useContext(ThemeContext)
  return theme
}
