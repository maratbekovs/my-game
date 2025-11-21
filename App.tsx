import React, { useState } from 'react';
import { BattleArena } from './components/BattleArena';
import { GameProvider, useGameEngine } from './services/GameContext';

// Internal component to handle game launch logic since we need access to the context
const GameLobby: React.FC = () => {
  const engine = useGameEngine();
  const [view, setView] = useState<'menu' | 'host' | 'join' | 'game'>('menu');
  const [playerName, setPlayerName] = useState('Operative');
  const [roomCode, setRoomCode] = useState('');
  const [botCount, setBotCount] = useState(6);

  const generateRoomCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setRoomCode(code);
    setView('host');
  };

  const handleJoinSetup = () => {
    setRoomCode('');
    setView('join');
  };

  const handleHostStart = () => {
    // ПЕРЕДАЕМ playerName
    engine.initGame({ 
      botCount: botCount, 
      roomCode,
      playerName: playerName 
    });
    setView('game');
  };

  const handleJoinStart = () => {
    if (roomCode.length !== 6) return;
    // ПЕРЕДАЕМ playerName
    engine.initGame({ 
      botCount: 0, 
      roomCode,
      playerName: playerName 
    });
    setView('game');
  };

  if (view === 'game') {
    return <BattleArena playerName={playerName} onExit={() => setView('menu')} />;
  }

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#050505] text-white">
      {/* Background */}
      <div className="absolute inset-0 z-0 opacity-20" 
           style={{ 
             backgroundImage: 'linear-gradient(#155e75 1px, transparent 1px), linear-gradient(90deg, #155e75 1px, transparent 1px)', 
             backgroundSize: '40px 40px',
             perspective: '1000px',
             transform: 'rotateX(60deg) translateY(-100px) scale(2)',
             transformOrigin: 'top center'
           }}>
      </div>
      
      <div className="z-10 w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="font-display text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 tracking-wider neon-text drop-shadow-2xl">
            NEON<br/>ARENA
          </h1>
          <div className="mt-2 h-1 w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
        </div>

        {/* Main Menu View */}
        {view === 'menu' && (
          <div className="flex flex-col gap-4 animate-fadeIn">
             <div className="space-y-2 mb-4">
                <label className="block text-xs font-bold text-cyan-500 uppercase tracking-widest">Identity</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full border-b-2 border-slate-700 bg-transparent px-2 py-3 text-2xl font-bold text-white outline-none focus:border-cyan-400 focus:bg-slate-800/50 transition-all placeholder-slate-600 font-display text-center"
                  placeholder="CALLSIGN"
                  maxLength={12}
                />
              </div>

              <button onClick={generateRoomCode} className="group relative w-full overflow-hidden rounded bg-cyan-600 px-6 py-4 text-lg font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95">
                 <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 opacity-80 group-hover:opacity-100"></div>
                 <span className="relative z-10 flex items-center justify-center gap-2 font-display tracking-wider">CREATE ROOM</span>
              </button>

              <button onClick={handleJoinSetup} className="group relative w-full overflow-hidden rounded border border-cyan-600/50 bg-transparent px-6 py-4 text-lg font-bold text-cyan-400 shadow-lg transition-all hover:bg-cyan-900/20 active:scale-95">
                 <span className="relative z-10 flex items-center justify-center gap-2 font-display tracking-wider">JOIN ROOM</span>
              </button>
          </div>
        )}

        {/* Host View */}
        {view === 'host' && (
          <div className="flex flex-col gap-6 bg-slate-900/90 p-6 rounded-xl border border-slate-700 backdrop-blur-xl animate-fadeIn">
            <div className="text-center">
              <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Access Code</div>
              <div className="font-mono text-4xl font-bold text-yellow-400 tracking-[0.2em] neon-text">{roomCode}</div>
            </div>
            
            <div className="flex flex-col gap-2 px-4 py-3 bg-slate-800/50 rounded border border-slate-700">
               <div className="flex justify-between items-center mb-2">
                  <span className="font-display font-bold text-cyan-400">AI DRONES</span>
                  <span className="font-mono text-xl font-bold text-white">{botCount}</span>
               </div>
               <input 
                  type="range" 
                  min="0" 
                  max="10" 
                  value={botCount} 
                  onChange={(e) => setBotCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
               />
               <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>NONE</span>
                  <span>SWARM</span>
               </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setView('menu')} className="flex-1 py-3 rounded border border-slate-600 text-slate-400 font-bold hover:bg-slate-800">BACK</button>
              <button onClick={handleHostStart} className="flex-[2] py-3 rounded bg-cyan-600 text-white font-bold font-display tracking-wider hover:bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                LAUNCH
              </button>
            </div>
          </div>
        )}

        {/* Join View */}
        {view === 'join' && (
          <div className="flex flex-col gap-6 bg-slate-900/90 p-6 rounded-xl border border-slate-700 backdrop-blur-xl animate-fadeIn">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-cyan-500 uppercase tracking-widest text-center">Enter Access Code</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full border-2 border-slate-700 bg-slate-950 px-4 py-3 text-3xl font-mono font-bold text-white outline-none focus:border-cyan-400 text-center tracking-[0.5em]"
                placeholder="000000"
              />
            </div>

            <div className="flex gap-4">
              <button onClick={() => setView('menu')} className="flex-1 py-3 rounded border border-slate-600 text-slate-400 font-bold hover:bg-slate-800">BACK</button>
              <button onClick={handleJoinStart} disabled={roomCode.length < 6} className="flex-[2] py-3 rounded bg-green-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold font-display tracking-wider hover:bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                CONNECT
              </button>
            </div>
          </div>
        )}

        <div className="mt-12 flex justify-center gap-8 text-center text-xs text-slate-500 font-mono">
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-800">W</div>
              <span>MOVE</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-800">✜</div>
              <span>AIM</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-8 w-20 items-center justify-center rounded border border-slate-700 bg-slate-800">SPACE</div>
              <span>FIRE</span>
            </div>
        </div>

        <div className="mt-8 text-center">
          <a href="https://maratbekov.com" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-600 hover:text-cyan-500 transition-colors font-medium">
            Developed by Maratbekov
          </a>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <GameProvider>
      <GameLobby />
    </GameProvider>
  );
};

export default App;