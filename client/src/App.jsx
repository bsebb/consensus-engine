import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import JoinRoom from './pages/JoinRoom'
import HostSettings from './pages/HostSettings'
import SwipeDeck from './pages/SwipeDeck'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JoinRoom />} />
        <Route path="/host" element={<HostSettings />} />
        <Route path="/swipe" element={<SwipeDeck />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
