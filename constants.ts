
export const PLAYER_SPEED = 5;
export const PLAYER_RADIUS = 20;
export const BULLET_SPEED = 15;
export const BULLET_RADIUS = 5;
export const BULLET_DAMAGE = 15;
export const FIRE_RATE_MS = 100; 
export const RESPAWN_TIME_MS = 3000;

// Energy System
export const MAX_ENERGY = 100;
export const ENERGY_COST = 15; 
export const ENERGY_REGEN = 30; 

// Power Up System
export const POWERUP_RADIUS = 15;
export const BUFF_DURATION_MS = 10000; 
export const POWERUP_SPAWN_RATE_MS = 5000; 
export const MAX_POWERUPS = 10;

export const COLORS = [
  '#06b6d4',
  '#ef4444', 
  '#22c55e',
  '#eab308', 
  '#a855f7', 
  '#f97316', 
];

export const OBSTACLES = [
  { x: 500, y: 500, w: 200, h: 50, color: '#334155' },
  { x: 1200, y: 800, w: 50, h: 300, color: '#334155' },
  { x: 800, y: 200, w: 100, h: 100, color: '#334155' },
  { x: 200, y: 1500, w: 300, h: 50, color: '#334155' },
  { x: 1500, y: 1200, w: 200, h: 200, color: '#334155' },
];
