import React from 'react';
import { Link } from 'react-router-dom';

function SwipeDeck() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>The Swipe Deck</h1>
      <p>Swipe left to Veto, swipe right to Approve.</p>

      {/* Placeholder for Swipe Card */}
      <div style={{ 
        width: '300px', 
        height: '400px', 
        border: '2px solid #ccc', 
        borderRadius: '10px', 
        margin: '2rem auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9f9f9'
      }}>
        <h2>Restaurant Name (Mock)</h2>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
        <button style={{ padding: '1rem', backgroundColor: '#ff4d4d', color: 'white', border: 'none', borderRadius: '5px' }}>Veto (Left)</button>
        <button style={{ padding: '1rem', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '5px' }}>Approve (Right)</button>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <Link to="/">Exit to Join Room</Link>
      </div>
    </div>
  );
}

export default SwipeDeck;
