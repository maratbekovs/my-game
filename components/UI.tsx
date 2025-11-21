
import React from 'react';
import { GameState, Player } from '../types';

interface UIProps {
  gameState: GameState;
  myPlayerId: string;
  onExit: () => void;
}

export const UI: React.FC<UIProps> = ({ gameState, myPlayerId, onExit }) => {
  const myPlayer = gameState.players.get(myPlayerId);
  const leaderboard = Array.from<Player>(gameState.players.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <div className="pointer-events-none absolute inset-0 p-6">
      
      {/* Top Left: Player Status */}
      <div className="absolute top-6 left-6 flex flex-col gap-4">
        <div className="relative overflow-hidden rounded-lg border-l-4 border-cyan-500 bg-slate-900/80 p-4 backdrop-blur-md shadow-lg min-w-[260px]">
          <div className="flex justify-between items-end mb-2">
             <h2 className="font-display text-xl font-bold text-white tracking-wider">{myPlayer?.name || 'SPECTATOR'}</h2>
             <span className="text-xs font-mono text-cyan-400 opacity-70">
               {gameState.roomCode ? `ROOM: ${gameState.roomCode}` : 'OFFLINE'}
             </span>
          </div>
          
          {/* Health Bar */}
          <div className="relative h-5 w-full bg-slate-800 skew-x-[-10deg] overflow-hidden border border-slate-600 mb-1">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-600 to-blue-500 transition-all duration-300"
              style={{ width: `${(myPlayer?.hp || 0) / (myPlayer?.maxHp || 100) * 100}%` }}
            ></div>
          </div>
          
          {/* Energy Bar */}
          <div className="relative h-2 w-full bg-slate-800 skew-x-[-10deg] overflow-hidden border border-slate-600">
             <div 
              className={`absolute top-0 left-0 h-full transition-all duration-100 ${myPlayer && myPlayer.energy < 15 ? 'bg-red-500 animate-pulse' : 'bg-yellow-400'}`}
              style={{ width: `${(myPlayer?.energy || 0) / (myPlayer?.maxEnergy || 100) * 100}%` }}
            ></div>
          </div>

          <div className="mt-2 flex justify-between text-xs font-mono text-slate-400">
             <span>INTEGRITY: <span className="text-white">{Math.max(0, Math.floor(myPlayer?.hp || 0))}%</span></span>
             <span>PWR: <span className={myPlayer && myPlayer.energy < 15 ? "text-red-500 font-bold" : "text-yellow-400"}>{Math.floor(myPlayer?.energy || 0)}%</span></span>
          </div>
        </div>

        {/* Kills Counter */}
        <div className="flex items-center gap-3 rounded-lg bg-slate-900/80 px-4 py-2 backdrop-blur-md border border-slate-700 w-fit">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">KILLS</div>
            <div className="font-display text-2xl font-black text-yellow-400 drop-shadow-md">{myPlayer?.score || 0}</div>
        </div>
      </div>

      {/* Top Right: Leaderboard */}
      <div className="absolute top-6 right-6">
        <div className="w-64 overflow-hidden rounded-xl border border-slate-700 bg-slate-900/90 shadow-2xl backdrop-blur-md">
          <div className="bg-slate-800/50 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
            <h3 className="font-display text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Live Feed
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">{gameState.players.size} UNITS</span>
          </div>
          <div className="p-2 flex flex-col gap-1">
            {leaderboard.map((p, i) => (
              <div 
                key={p.id} 
                className={`flex items-center justify-between px-3 py-2 rounded ${
                  p.id === myPlayerId 
                    ? 'bg-cyan-500/20 border border-cyan-500/30' 
                    : 'hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-xs font-bold ${i === 0 ? 'text-yellow-400' : 'text-slate-500'}`}>
                    #{i + 1}
                  </span>
                  <span className={`text-sm font-bold ${p.id === myPlayerId ? 'text-cyan-300' : 'text-slate-300'}`}>
                    {p.name}
                  </span>
                </div>
                <span className="font-mono text-sm font-bold text-white">{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Center: Kill Feed */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col-reverse gap-2 w-[400px] pointer-events-none">
        {gameState.killFeed.map((kill) => (
            <div key={kill.id} className="flex items-center justify-center gap-2 bg-gradient-to-r from-transparent via-slate-900/80 to-transparent py-1 px-4 text-sm animate-[fadeIn_0.3s_ease-out]">
                <span className="font-bold text-cyan-400">{kill.killerName}</span>
                <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTQhMzQxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDEydjlsMy0zbS0zIDNsLTMtMyIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iNiIgcj0iNCIvPjwvc3ZnPg==" className="w-4 h-4 opacity-50" alt="killed" />
                <span className="font-bold text-red-400">{kill.victimName}</span>
            </div>
        ))}
      </div>

      {/* Bottom Right: Controls & Exit */}
      <div className="absolute bottom-6 right-6 flex items-end gap-4 pointer-events-auto">
          <div className="hidden lg:block text-right text-xs text-slate-500 font-mono">
            <p>MOUSE to AIM</p>
            <p>LMB / SPACE to FIRE</p>
            <p className="text-yellow-500 mt-1">WARNING: WEAPON OVERHEATS</p>
          </div>
          <button 
            onClick={onExit}
            className="group relative px-6 py-2 overflow-hidden rounded bg-red-600/80 text-white font-bold font-display tracking-wider transition-all hover:bg-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]"
          >
              <span className="relative z-10">ABORT</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-200"></div>
          </button>
      </div>
      
      {/* Bottom Left: Coordinates */}
      <div className="absolute bottom-6 left-6 font-mono text-xs text-cyan-700">
          COORDS: <span className="text-cyan-500">{Math.round(myPlayer?.x || 0)}, {Math.round(myPlayer?.y || 0)}</span>
      </div>
    </div>
  );
};
