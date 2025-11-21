import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

// --- Типы ---
type PowerUpType = 'HEALTH' | 'SPEED' | 'DAMAGE';

interface PowerUp {
  id: string;
  x: number;
  y: number;
  type: PowerUpType;
}

interface Player {
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
  isBot: boolean;
  lastFireTime: number;
  speedBoostTimer: number;
  damageBoostTimer: number;
  invulnerabilityTimer: number;
}

interface Bullet {
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

interface GameState {
  players: Record<string, Player>;
  bullets: Bullet[];
  powerUps: PowerUp[];
  killFeed: any[];
  mapSize: { width: number; height: number };
  lastPowerUpSpawn: number;
}

// --- Константы ---
const MAP_SIZE = { width: 2000, height: 2000 };
const PLAYER_SPEED = 5;
const PLAYER_RADIUS = 20;
const BULLET_SPEED = 15;
const BULLET_RADIUS = 5;
const BULLET_DAMAGE = 15;

const MAX_ENERGY = 100;
const ENERGY_COST = 15;
const ENERGY_REGEN = 30;
const FIRE_RATE_MS = 100;

const POWERUP_RADIUS = 15;
const MAX_POWERUPS = 10;
const POWERUP_SPAWN_RATE_MS = 5000;
const BUFF_DURATION_MS = 10000;

const OBSTACLES = [
  { x: 500, y: 500, w: 200, h: 50 },
  { x: 1200, y: 800, w: 50, h: 300 },
  { x: 800, y: 200, w: 100, h: 100 },
  { x: 200, y: 1500, w: 300, h: 50 },
  { x: 1500, y: 1200, w: 200, h: 200 },
];

// --- Хелперы ---
function checkWallCollision(x: number, y: number, radius: number = 0): boolean {
    for (const obs of OBSTACLES) {
        if (x + radius > obs.x && x - radius < obs.x + obs.w &&
            y + radius > obs.y && y - radius < obs.y + obs.h) {
            return true;
        }
    }
    return false;
}

function getRandomSafePosition() {
    let x, y, valid = false;
    // Защита от бесконечного цикла (максимум 100 попыток)
    let attempts = 0;
    while (!valid && attempts < 100) {
        x = Math.random() * (MAP_SIZE.width - 100) + 50;
        y = Math.random() * (MAP_SIZE.height - 100) + 50;
        if (!checkWallCollision(x, y, PLAYER_RADIUS + 10)) valid = true;
        attempts++;
    }
    // Фолбек, если не нашли место (спавн в углу)
    if (!valid) { x = 100; y = 100; }
    return { x: x!, y: y! };
}

// --- Сервер ---
const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

const ROOMS: Record<string, GameState> = {};

const createRoomState = (): GameState => ({
  players: {},
  bullets: [],
  powerUps: [],
  killFeed: [],
  mapSize: MAP_SIZE,
  lastPowerUpSpawn: Date.now(),
});

io.on('connection', (socket: Socket) => {
  let currentRoom = '';

  // --- ИСПРАВЛЕНИЕ ЗДЕСЬ: Добавили botCount в аргументы ---
  socket.on('join_room', ({ roomCode, name, botCount }: { roomCode: string, name: string, botCount?: number }) => {
    socket.join(roomCode);
    currentRoom = roomCode;

    // Если комнаты нет, создаем её (тот кто создал - Хост)
    if (!ROOMS[roomCode]) {
      ROOMS[roomCode] = createRoomState();
      
      // Используем переданное количество ботов или 0
      const count = typeof botCount === 'number' ? botCount : 0;
      for(let i=0; i < count; i++) {
          addBot(ROOMS[roomCode], `AI-${i+1}`);
      }
    }

    const pos = getRandomSafePosition();
    const player: Player = {
      id: socket.id,
      x: pos.x, y: pos.y,
      hp: 100, maxHp: 100, 
      energy: MAX_ENERGY, maxEnergy: MAX_ENERGY,
      angle: 0, radius: PLAYER_RADIUS, color: '#06b6d4',
      name: name || 'Operative',
      score: 0, isDead: false, respawnTimer: 0,
      isBot: false, lastFireTime: 0,
      speedBoostTimer: 0, damageBoostTimer: 0, invulnerabilityTimer: 3000 
    };

    ROOMS[roomCode].players[socket.id] = player;
    socket.emit('init_packet', { id: socket.id });
  });

  socket.on('input', (input: any) => {
    if (!currentRoom || !ROOMS[currentRoom]) return;
    const state = ROOMS[currentRoom];
    const player = state.players[socket.id];
    if (!player || player.isDead) return;

    const speed = player.speedBoostTimer > 0 ? PLAYER_SPEED * 1.5 : PLAYER_SPEED;
    let dx = 0, dy = 0;
    if (input.up) dy -= speed;
    if (input.down) dy += speed;
    if (input.left) dx -= speed;
    if (input.right) dx += speed;

    if (dx !== 0 && dy !== 0) {
       const len = Math.sqrt(dx*dx + dy*dy);
       dx = (dx/len) * speed;
       dy = (dy/len) * speed;
    }

    const nextX = player.x + dx;
    const nextY = player.y + dy;

    if (!checkWallCollision(nextX, player.y, PLAYER_RADIUS)) player.x = Math.max(PLAYER_RADIUS, Math.min(MAP_SIZE.width - PLAYER_RADIUS, nextX));
    if (!checkWallCollision(player.x, nextY, PLAYER_RADIUS)) player.y = Math.max(PLAYER_RADIUS, Math.min(MAP_SIZE.height - PLAYER_RADIUS, nextY));
    
    if (input.facingAngle !== undefined) player.angle = input.facingAngle;

    if (input.shoot) attemptShoot(state, player);
  });

  socket.on('disconnect', () => {
    if (currentRoom && ROOMS[currentRoom]) {
      delete ROOMS[currentRoom].players[socket.id];
      if (Object.keys(ROOMS[currentRoom].players).length === 0) {
          delete ROOMS[currentRoom];
      }
    }
  });
});

function addBot(state: GameState, name: string) {
    const id = 'bot-' + Math.random().toString(36).substr(2,5);
    const pos = getRandomSafePosition();
    state.players[id] = {
        id,
        x: pos.x, y: pos.y,
        hp: 100, maxHp: 100, 
        energy: MAX_ENERGY, maxEnergy: MAX_ENERGY,
        angle: 0, radius: PLAYER_RADIUS, color: '#ef4444',
        name, score: 0, isDead: false, respawnTimer: 0,
        isBot: true, lastFireTime: 0,
        speedBoostTimer: 0, damageBoostTimer: 0, invulnerabilityTimer: 0
    };
}

function attemptShoot(state: GameState, p: Player) {
    const now = Date.now();
    if (now - p.lastFireTime < FIRE_RATE_MS) return;
    if (p.energy < ENERGY_COST) return;

    p.energy -= ENERGY_COST;
    p.lastFireTime = now;

    const damage = p.damageBoostTimer > 0 ? BULLET_DAMAGE * 2 : BULLET_DAMAGE;
    const color = p.damageBoostTimer > 0 ? '#d946ef' : p.color; 

    const bullet: Bullet = {
        id: Math.random().toString(36).substr(2,9),
        x: p.x + Math.cos(p.angle) * 25,
        y: p.y + Math.sin(p.angle) * 25,
        vx: Math.cos(p.angle) * BULLET_SPEED,
        vy: Math.sin(p.angle) * BULLET_SPEED,
        ownerId: p.id,
        radius: BULLET_RADIUS,
        damage: damage,
        color: color
    };
    state.bullets.push(bullet);
}

function updateBots(state: GameState) {
    const players = Object.values(state.players);
    players.forEach(bot => {
        if (!bot.isBot || bot.isDead) return;

        let targetX = bot.x, targetY = bot.y;
        let action = 'IDLE';

        let nearestPupDist = Infinity;
        let nearestPup: PowerUp | null = null;
        state.powerUps.forEach(pup => {
            const dist = Math.hypot(pup.x - bot.x, pup.y - bot.y);
            if (dist < 400 && dist < nearestPupDist) {
                nearestPupDist = dist;
                nearestPup = pup;
            }
        });

        let nearestEnemy: Player | null = null;
        let minEnemyDist = Infinity;
        players.forEach(target => {
            if (target.id !== bot.id && !target.isDead) {
                const dist = Math.hypot(target.x - bot.x, target.y - bot.y);
                if (dist < minEnemyDist) {
                    minEnemyDist = dist;
                    nearestEnemy = target;
                }
            }
        });

        if (nearestPup && (bot.hp < 50 || nearestPupDist < 200)) {
            targetX = nearestPup.x; targetY = nearestPup.y; action = 'MOVE_TO';
        } else if (nearestEnemy) {
            targetX = nearestEnemy.x; targetY = nearestEnemy.y; action = 'ATTACK';
        }

        if (action !== 'IDLE') {
            const angleToTarget = Math.atan2(targetY - bot.y, targetX - bot.x);
            bot.angle = angleToTarget;
            
            const speed = bot.speedBoostTimer > 0 ? PLAYER_SPEED * 1.2 : PLAYER_SPEED * 0.8; 
            let moveX = 0, moveY = 0;

            if (action === 'MOVE_TO' || (action === 'ATTACK' && minEnemyDist > 300)) {
                moveX = Math.cos(angleToTarget) * speed;
                moveY = Math.sin(angleToTarget) * speed;
            } else if (action === 'ATTACK' && minEnemyDist < 150) {
                moveX = -Math.cos(angleToTarget) * speed;
                moveY = -Math.sin(angleToTarget) * speed;
            } else {
                moveX = Math.cos(angleToTarget + Math.PI/2) * speed * 0.5;
                moveY = Math.sin(angleToTarget + Math.PI/2) * speed * 0.5;
            }

            const nextX = bot.x + moveX;
            const nextY = bot.y + moveY;

            if (!checkWallCollision(nextX, bot.y, PLAYER_RADIUS)) bot.x = nextX;
            if (!checkWallCollision(bot.x, nextY, PLAYER_RADIUS)) bot.y = nextY;
            
            bot.x = Math.max(PLAYER_RADIUS, Math.min(MAP_SIZE.width - PLAYER_RADIUS, bot.x));
            bot.y = Math.max(PLAYER_RADIUS, Math.min(MAP_SIZE.height - PLAYER_RADIUS, bot.y));

            if (action === 'ATTACK' && minEnemyDist < 600) {
                 attemptShoot(state, bot);
            }
        }
    });
}

// --- Игровой Цикл ---
const TICK_RATE = 60;
setInterval(() => {
  const now = Date.now();

  for (const roomCode in ROOMS) {
    const state = ROOMS[roomCode];
    
    if (state.powerUps.length < MAX_POWERUPS && now - state.lastPowerUpSpawn > POWERUP_SPAWN_RATE_MS) {
        if (Math.random() > 0.3) {
            const pos = getRandomSafePosition();
            const types: PowerUpType[] = ['HEALTH', 'SPEED', 'DAMAGE'];
            state.powerUps.push({
                id: Math.random().toString(36).substr(2,9),
                x: pos.x, y: pos.y,
                type: types[Math.floor(Math.random() * types.length)]
            });
            state.lastPowerUpSpawn = now;
        }
    }

    for (let i = state.powerUps.length - 1; i >= 0; i--) {
        const pup = state.powerUps[i];
        let consumed = false;
        for (const pid in state.players) {
            const p = state.players[pid];
            if (p.isDead) continue;
            if (Math.hypot(p.x - pup.x, p.y - pup.y) < PLAYER_RADIUS + POWERUP_RADIUS) {
                if (pup.type === 'HEALTH') p.hp = Math.min(p.maxHp, p.hp + 50);
                else if (pup.type === 'SPEED') p.speedBoostTimer = BUFF_DURATION_MS;
                else if (pup.type === 'DAMAGE') p.damageBoostTimer = BUFF_DURATION_MS;
                consumed = true;
                break;
            }
        }
        if (consumed) state.powerUps.splice(i, 1);
    }

    updateBots(state);

    for (let i = state.bullets.length - 1; i >= 0; i--) {
       const b = state.bullets[i];
       b.x += b.vx;
       b.y += b.vy;

       if (b.x < 0 || b.x > MAP_SIZE.width || b.y < 0 || b.y > MAP_SIZE.height || checkWallCollision(b.x, b.y, BULLET_RADIUS)) {
         state.bullets.splice(i, 1);
         continue;
       }

       let hit = false;
       for (const pid in state.players) {
         const p = state.players[pid];
         if (p.id === b.ownerId || p.isDead || p.invulnerabilityTimer > 0) continue;
         if (Math.hypot(p.x - b.x, p.y - b.y) < p.radius + b.radius) {
            p.hp -= b.damage;
            hit = true;
            if (p.hp <= 0) {
                p.isDead = true;
                p.hp = 0;
                p.respawnTimer = 3000; 
                const killer = state.players[b.ownerId];
                if (killer) killer.score++;
                state.killFeed.unshift({
                    id: Math.random().toString(),
                    killerName: killer ? killer.name : 'Unknown',
                    victimName: p.name,
                    timestamp: Date.now()
                });
                if (state.killFeed.length > 5) state.killFeed.pop();
            }
            break;
         }
       }
       if (hit) state.bullets.splice(i, 1);
    }

    for (const pid in state.players) {
        const p = state.players[pid];
        const dt = 1000 / TICK_RATE;
        
        if (p.invulnerabilityTimer > 0) p.invulnerabilityTimer -= dt;
        if (p.speedBoostTimer > 0) p.speedBoostTimer -= dt;
        if (p.damageBoostTimer > 0) p.damageBoostTimer -= dt;

        if (!p.isDead && p.energy < p.maxEnergy) {
            p.energy = Math.min(p.maxEnergy, p.energy + (ENERGY_REGEN / TICK_RATE));
        }

        if (p.isDead) {
            p.respawnTimer -= dt;
            if (p.respawnTimer <= 0) {
                p.isDead = false;
                p.hp = 100;
                p.energy = 100;
                const pos = getRandomSafePosition();
                p.x = pos.x; p.y = pos.y;
                p.invulnerabilityTimer = 3000;
            }
        }
    }

    io.to(roomCode).emit('game_state', {
        players: Object.values(state.players),
        bullets: state.bullets,
        powerUps: state.powerUps,
        killFeed: state.killFeed
    });
  }
}, 1000 / TICK_RATE);

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});