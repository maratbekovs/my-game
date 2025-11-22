export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
  mouseX: number;
  mouseY: number;
  facingAngle?: number; 
}

export type PowerUpType = 'HEALTH' | 'SPEED' | 'DAMAGE';

export interface PowerUp {
  id: string;
  x: number;
  y: number;
  type: PowerUpType;
}

export interface Player {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  angle: number;
  radius: number;
  color: string;
  name: string;
  score: number;
  isDead: boolean;
  respawnTimer: number;
  invulnerabilityTimer: number;
  isBot: boolean;
  speedBoostTimer: number;
  damageBoostTimer: number;
  isBoss?: boolean;
  level: number;
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
  radius: number;
  damage: number;
  color: string;
}

export interface KillEvent {
  id: string;
  killerName: string;
  victimName: string;
  timestamp: number;
}

export interface GameState {
  players: Map<string, Player>;
  bullets: Bullet[];
  powerUps: PowerUp[];
  killFeed: KillEvent[];
  mapSize: { width: number; height: number };
  roomCode?: string;
  startTime: number;
  bossSpawned: boolean;
  isGameOver: boolean;
}

export const VIEWPORT_SIZE = { width: window.innerWidth, height: window.innerHeight };