import React from 'react';
import { Link } from 'react-router-dom';

function HostSettings() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Host Settings</h1>
      <p>Configure the parameters for your group's options.</p>

      {/* Placeholder settings */}
      <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <label>
          Location/Radius: <input type="text" placeholder="e.g. 2km" />
        </label>
        <label>
          Category: <input type="text" placeholder="e.g. cafes, restaurants" />
        </label>
        
        <button style={{ padding: '0.5rem 1rem', marginTop: '1rem' }}>Create Room</button>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <Link to="/">Back to Join Room</Link>
        <br/><br/>
        <Link to="/swipe">Jump to Swipe Deck (Test)</Link>
      </div>
    </div>
  );
}

export default HostSettings;
