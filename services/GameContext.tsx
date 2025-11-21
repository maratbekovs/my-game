import React, { createContext, useContext, useRef } from 'react';
import { GameEngine } from './GameEngine';

interface GameContextType {
  engine: GameEngine;
}

const GameContext = createContext<GameContextType | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const engineRef = useRef(new GameEngine());

  return (
    <GameContext.Provider value={{ engine: engineRef.current }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameEngine = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGameEngine must be used within GameProvider");
  return ctx.engine;
};