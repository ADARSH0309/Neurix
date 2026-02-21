import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './main.css'
import App from './App.tsx'
import { LandingPage } from './components/LandingPage.tsx'

function Root(): React.ReactElement {
  const [showApp, setShowApp] = useState<boolean>(() => {
    // Check if user has visited before or has a direct link to app
    const hasVisited = localStorage.getItem('neurix_visited')
    const urlParams = new URLSearchParams(window.location.search)
    const directAccess = urlParams.has('access_token') || urlParams.has('app')
    return hasVisited === 'true' || directAccess
  })

  useEffect(() => {
    // If showing app, mark as visited
    if (showApp) {
      localStorage.setItem('neurix_visited', 'true')
    }
  }, [showApp])

  const handleGetStarted = (): void => {
    setShowApp(true)
    localStorage.setItem('neurix_visited', 'true')
  }

  const handleBackToLanding = (): void => {
    setShowApp(false)
  }

  if (showApp) {
    return <App />
  }

  return <LandingPage onGetStarted={handleGetStarted} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
