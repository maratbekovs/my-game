import { io, Socket } from 'socket.io-client';
import { Player, Bullet, GameState, InputState, PowerUp } from '../types';
import { MAP_SIZE } from '../constants';

export class GameEngine {
  state: GameState;
  socket: Socket | null = null;
  myId: string | null = null;

  constructor() {
    this.state = {
      players: new Map(),
      bullets: [],
      powerUps: [],
      killFeed: [],
      mapSize: MAP_SIZE,
      startTime: Date.now(),
      bossSpawned: false,
      isGameOver: false
    };
  }

  initGame(options: { botCount: number, roomCode?: string, playerName?: string }) {
    this.state.players.clear();
    this.state.bullets = [];
    this.state.powerUps = [];
    this.state.killFeed = [];
    this.state.roomCode = options.roomCode;
    
    this.state.startTime = Date.now();
    this.state.bossSpawned = false;
    this.state.isGameOver = false;

    if (this.socket) {
        this.socket.disconnect();
    }

    this.socket = io('http://localhost:3001'); 

    const joinRoom = () => {
        console.log('Joining room:', options.roomCode);
        this.socket?.emit('join_room', { 
            roomCode: options.roomCode || 'default',
            name: options.playerName || 'Operative',
            botCount: options.botCount
        });
    };

    if (this.socket.connected) {
        joinRoom();
    } else {
        this.socket.on('connect', () => {
            console.log('Connected to game server!');
            joinRoom();
        });
    }

    this.socket.on('init_packet', (data: { id: string }) => {
        this.myId = data.id;
        console.log('My Player ID assigned:', this.myId);
    });

    this.socket.on('game_state', (serverState: any) => {
        const activeIds = new Set<string>();
        if (Array.isArray(serverState.players)) {
            serverState.players.forEach((p: Player) => {
                this.state.players.set(p.id, p);
                activeIds.add(p.id);
            });
        }
        for (const id of this.state.players.keys()) {
            if (!activeIds.has(id)) this.state.players.delete(id);
        }

        this.state.bullets = serverState.bullets;
        this.state.killFeed = serverState.killFeed || [];
        this.state.powerUps = serverState.powerUps || [];
        
        this.state.startTime = serverState.startTime;
        this.state.bossSpawned = serverState.bossSpawned;
        this.state.isGameOver = serverState.isGameOver;
    });
  }

  addPlayer(id: string, name: string) {
      return { id, name, hp: 100, level: 1 } as Player;
  }

  removePlayer(id: string) {
    if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
    }
  }

  update(deltaTime: number, playerInput: InputState, playerId: string) {
    if (this.state.isGameOver) return;

    if (this.socket && this.myId) {
        this.socket.emit('input', {
            up: playerInput.up,
            down: playerInput.down,
            left: playerInput.left,
            right: playerInput.right,
            shoot: playerInput.shoot,
            facingAngle: playerInput.facingAngle,
            mouseX: playerInput.mouseX,
            mouseY: playerInput.mouseY
        });
    }
  }
}