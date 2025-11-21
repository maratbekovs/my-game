import { io, Socket } from 'socket.io-client';
import { Player, Bullet, GameState, InputState, MAP_SIZE, PowerUp } from '../types';

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
    };
  }

  initGame(options: { botCount: number, roomCode?: string, playerName?: string }) {
    // 1. Очистка
    this.state.players.clear();
    this.state.bullets = [];
    this.state.powerUps = [];
    this.state.killFeed = [];
    this.state.roomCode = options.roomCode;

    // 2. Если сокет уже был, отключаем его перед созданием нового
    if (this.socket) {
        this.socket.disconnect();
    }

    // 3. Создаем новое подключение
    // ВАЖНО: Если вы играете по сети (разные устройства), замените 'localhost' на IP вашего ПК
    this.socket = io('http://localhost:3001'); 

    // Функция отправки запроса на вход
    const joinRoom = () => {
        console.log('Joining room:', options.roomCode);
        this.socket?.emit('join_room', { 
            roomCode: options.roomCode || 'default',
            name: options.playerName || 'Operative',
            botCount: options.botCount // <-- ТЕПЕРЬ ПЕРЕДАЕМ КОЛИЧЕСТВО БОТОВ
        });
    };

    // 4. Обработка подключения
    // Если сокет подключился мгновенно (например, на локалхосте)
    if (this.socket.connected) {
        joinRoom();
    } else {
        // Иначе ждем события
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
    });
  }

  addPlayer(id: string, name: string) {
      return { id, name, hp: 100 } as Player;
  }

  removePlayer(id: string) {
    if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
    }
  }

  update(deltaTime: number, playerInput: InputState, playerId: string) {
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