import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Settings } from 'lucide-react';

export default function JoinRoom() {
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (pin.length === 4 && name.length > 0) {
      // Navigate to Lobby / Step Zero / Suggestions
      navigate(`/lobby/${pin}`, { state: { isHost: false, userName: name } });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-500 to-purple-600">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="bg-indigo-100 p-4 rounded-full">
              <Users className="w-12 h-12 text-indigo-600" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
            Consensus Engine
          </h1>
          <p className="text-center text-gray-500 mb-8">
            Stop arguing. Start eating.
          </p>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <input 
                type="text" 
                placeholder="e.g. Seb"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room PIN</label>
              <input 
                type="text" 
                placeholder="4-digit PIN"
                maxLength={4}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-center tracking-[0.5em] font-mono text-xl"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 mt-6"
            >
              Join Room
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-500 text-sm mb-4">Or create a new room</p>
            <button 
              onClick={() => navigate('/host')}
              className="flex items-center justify-center w-full gap-2 text-indigo-600 font-semibold hover:text-indigo-800 transition"
            >
              <Settings className="w-4 h-4" />
              Host a Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
