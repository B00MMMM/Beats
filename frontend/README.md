# Beats - Music Streaming Web App

A Spotify-inspired music streaming web application built with React, featuring a modern dark theme UI with social features.

## 🎯 Features

- **Home Page**: Browse trending categories and recently played music
- **Playlist Details**: View and manage playlists with song listings
- **Music Details**: Explore albums and artist information
- **Social/Chat**: Connect with friends and share music recommendations

## 🛠️ Tech Stack

- **React 18** with Vite
- **React Router** for navigation
- **CSS Modules** for styling
- **Lucide React** for icons
- **No UI libraries** - custom components only

## 🎨 Theme

- Primary Accent: `#00FFD9` (cyan)
- Background: `#121212` / `#040404`
- Dark theme only

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn/pnpm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at `http://localhost:3000`

## 📁 Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── Sidebar/
│   ├── TopNavbar/
│   ├── BottomPlayer/
│   ├── PlaylistCard/
│   ├── SongRow/
│   ├── ArtistInfoPanel/
│   ├── FriendsList/
│   ├── ChatWindow/
│   └── ListeningActivityPanel/
├── pages/           # Page components
│   ├── HomePage.jsx
│   ├── PlaylistPage.jsx
│   ├── MusicDetailsPage.jsx
│   └── SocialPage.jsx
├── layouts/         # Layout components
│   └── Layout.jsx
├── App.jsx          # Main app component with routing
├── main.jsx         # Entry point
└── index.css        # Global styles
```

## 📄 Pages

1. **Home** (`/`) - Main dashboard with trending categories and recently played
2. **Playlist** (`/playlist/:id`) - Playlist details with song list
3. **Music Details** (`/music/:id`) - Album/artist details page
4. **Social** (`/friends`) - Friends list and chat interface

## 🎨 Design Principles

- Pixel-perfect UI matching reference designs
- Smooth hover effects and transitions (150-300ms)
- Consistent spacing and typography
- Dark theme with cyan accents
- Responsive layout for desktop

## ⚠️ Note

This is a **frontend-only** implementation. No backend integration is included. All data is mock/placeholder data.

## 📝 License

MIT
