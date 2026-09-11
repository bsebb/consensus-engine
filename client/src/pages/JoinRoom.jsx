import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Plus, ArrowRight } from 'lucide-react';

export default function JoinRoom() {
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (pin.length === 4 && name.length > 0) {
      navigate(`/lobby/${pin}`, { state: { isHost: false, userName: name } });
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col justify-between p-6 sm:p-8 select-none">
      
      {/* Top Brand Mark */}
      <div className="pt-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20 mb-3">
          <Sparkles className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-black">
          Consensus
        </h1>
        <p className="text-sm font-medium text-[#6E6E73] mt-1">
          Frictionless group decisions
        </p>
      </div>

      {/* Center Form Card (Apple Inset Card) */}
      <div className="w-full max-w-sm mx-auto my-auto">
        <form onSubmit={handleJoin} className="bg-white rounded-3xl p-6 shadow-sm border border-black/[0.04] space-y-5">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73] mb-1.5 px-1">
              Your Name
            </label>
            <input 
              type="text" 
              placeholder="e.g. Alex"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-h-[48px] px-4 rounded-xl bg-[#F8F8FA] border border-black/[0.06] text-base text-black placeholder:text-[#8E8E93] focus:bg-white focus:ring-2 focus:ring-[#007AFF] focus:border-transparent outline-none transition duration-150"
              required
            />
          </div>
          
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73] mb-1.5 px-1">
              Room PIN
            </label>
            <input 
              type="text" 
              placeholder="0000"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full min-h-[52px] px-4 rounded-xl bg-[#F8F8FA] border border-black/[0.06] text-center font-mono text-2xl tracking-[0.4em] text-black placeholder:text-[#8E8E93] focus:bg-white focus:ring-2 focus:ring-[#007AFF] focus:border-transparent outline-none transition duration-150"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={pin.length !== 4 || !name.trim()}
            className="w-full min-h-[48px] flex items-center justify-center gap-2 bg-[#007AFF] hover:bg-[#0071E3] disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-base rounded-xl transition duration-150 active:scale-[0.98] shadow-sm shadow-[#007AFF]/25"
          >
            <span>Join Room</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Bottom Floating Secondary Action (Thumb Zone) */}
      <div className="w-full max-w-sm mx-auto pb-4">
        <button 
          onClick={() => navigate('/host')}
          className="w-full min-h-[48px] flex items-center justify-center gap-2 bg-white hover:bg-[#F8F8FA] text-[#007AFF] font-semibold text-sm rounded-2xl border border-black/[0.05] shadow-xs active:scale-[0.98] transition duration-150"
        >
          <Plus className="w-4 h-4" />
          <span>Host a New Room</span>
        </button>
      </div>

    </div>
  );
}
