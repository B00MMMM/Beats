import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { PlayerProvider } from './context/PlayerContext'
import { SocketContextProvider } from './context/SocketContext'
import { ClerkProvider } from '@clerk/clerk-react'
import { BrowserRouter as Router } from 'react-router-dom'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <SocketContextProvider>
          <PlayerProvider>
            <App />
          </PlayerProvider>
        </SocketContextProvider>
      </ClerkProvider>
    </Router>
  </React.StrictMode>,
)
