import React from 'react';
import { Link } from 'react-router-dom';

function JoinRoom() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Join a Room</h1>
      <p>Enter the PIN to join your friends.</p>
      
      {/* Placeholder form */}
      <div style={{ marginTop: '2rem' }}>
        <input 
          type="text" 
          placeholder="Room PIN" 
          style={{ padding: '0.5rem', marginRight: '0.5rem' }} 
        />
        <button style={{ padding: '0.5rem 1rem' }}>Join</button>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <p>Or want to start your own room?</p>
        <Link to="/host">Go to Host Settings</Link>
      </div>
    </div>
  );
}

export default JoinRoom;
