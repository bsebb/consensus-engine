import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search } from 'lucide-react';

export default function HostSettings() {
  const [theme, setTheme] = useState('Restaurant');
  const navigate = useNavigate();

  const handleCreateRoom = (e) => {
    e.preventDefault();
    // TODO: Call POST /api/v1/rooms here, then get the PIN back
    const mockPin = "4921"; 
    navigate(`/deck/${mockPin}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-10">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Host a Room</h1>
          
          <form onSubmit={handleCreateRoom} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">What are we looking for?</label>
              <div className="grid grid-cols-2 gap-3">
                {['Restaurant', 'Cafe', 'Bar', 'Activity'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setTheme(opt)}
                    className={`py-2 px-4 rounded-lg border text-sm font-medium transition ${
                      theme === opt 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Radius (km)</label>
              <input 
                type="range" 
                min="1" 
                max="20" 
                defaultValue="5"
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>1km</span>
                <span>20km</span>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
            >
              <Search className="w-5 h-5" />
              Generate PIN & Start
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
