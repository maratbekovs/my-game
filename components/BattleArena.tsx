import React, { useEffect, useRef, useState } from 'react';
import { useGameEngine } from '../services/GameContext';
import { InputState, MAP_SIZE, PowerUpType } from '../types';
import { OBSTACLES, POWERUP_RADIUS } from '../constants';
import { UI } from './UI';

interface Props {
  playerName: string;
  onExit: () => void;
}

export const BattleArena: React.FC<Props> = ({ playerName, onExit }) => {
  const engine = useGameEngine();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [myId, setMyId] = useState<string>('');
  const [, setTick] = useState(0);
  
  const inputRef = useRef<InputState>({
    up: false, down: false, left: false, right: false, shoot: false, mouseX: 0, mouseY: 0
  });

  useEffect(() => {
    const waitForId = setInterval(() => {
        if (engine.myId) {
            setMyId(engine.myId);
            clearInterval(waitForId);
        }
    }, 100);
    return () => { 
        clearInterval(waitForId);
        if (engine.myId) engine.removePlayer(engine.myId); 
    };
  }, [engine]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent, isDown: boolean) => {
      switch (e.code) {
        case 'KeyW': inputRef.current.up = isDown; break;
        case 'KeyS': inputRef.current.down = isDown; break;
        case 'KeyA': inputRef.current.left = isDown; break;
        case 'KeyD': inputRef.current.right = isDown; break;
        case 'Space': inputRef.current.shoot = isDown; break;
      }
    };
    const handleMove = (e: MouseEvent) => {
      inputRef.current.mouseX = e.clientX;
      inputRef.current.mouseY = e.clientY;
    };
    const handleMouse = (isDown: boolean) => { inputRef.current.shoot = isDown; };

    const onDown = (e: KeyboardEvent) => handleKey(e, true);
    const onUp = (e: KeyboardEvent) => handleKey(e, false);
    const onMouseDown = () => handleMouse(true);
    const onMouseUp = () => handleMouse(false);

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    const uiInterval = setInterval(() => setTick(t => t + 1), 100);

    const render = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const myPlayer = engine.state.players.get(myId);
      
      if (!myPlayer) {
          ctx.fillStyle = '#050505';
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = '#ffffff';
          ctx.font = '20px "Orbitron"';
          ctx.textAlign = 'center';
          ctx.fillText("ESTABLISHING UPLINK...", width/2, height/2);
          return;
      }

      // --- ИЗМЕНЕНИЕ: КАМЕРА ВСЕГДА ПО ЦЕНТРУ ---
      // Мы больше не используем Math.max/min для ограничения краев
      // Теперь игрок всегда находится ровно в (width/2, height/2)
      const targetCamX = myPlayer.x - width / 2;
      const targetCamY = myPlayer.y - height / 2;
      
      // BG
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(-targetCamX, -targetCamY);

      // Grid
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#1e293b'; 
      ctx.beginPath();
      for (let x = 0; x <= MAP_SIZE.width; x += 100) {
        ctx.moveTo(x, 0); ctx.lineTo(x, MAP_SIZE.height);
      }
      for (let y = 0; y <= MAP_SIZE.height; y += 100) {
        ctx.moveTo(0, y); ctx.lineTo(MAP_SIZE.width, y);
      }
      ctx.stroke();

      // Obstacles
      for (const obs of OBSTACLES) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = obs.color; 
          ctx.fillStyle = '#0f172a'; 
          ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
          ctx.shadowBlur = 0;
          ctx.lineWidth = 2;
          ctx.strokeStyle = obs.color; 
          ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
      }

      // --- PowerUps ---
      const time = Date.now();
      for (const p of engine.state.powerUps) {
          const floatY = Math.sin(time / 200) * 5;
          
          let color = '#ffffff';
          let label = '?';
          if (p.type === 'HEALTH') { color = '#22c55e'; label = '+'; }
          if (p.type === 'SPEED') { color = '#3b82f6'; label = '>>'; }
          if (p.type === 'DAMAGE') { color = '#d946ef'; label = 'dmg'; }

          ctx.shadowBlur = 15;
          ctx.shadowColor = color;
          ctx.fillStyle = color;
          
          ctx.beginPath();
          ctx.arc(p.x, p.y + floatY, POWERUP_RADIUS, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#000';
          ctx.font = 'bold 10px "Orbitron"';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, p.x, p.y + floatY);
      }

      // --- Bullets ---
      ctx.lineCap = 'round';
      for (const b of engine.state.bullets) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = b.color;
        ctx.strokeStyle = b.color;
        ctx.lineWidth = b.radius * 2;

        const tailLen = 15; 
        const angle = Math.atan2(b.vy, b.vx);
        const tailX = b.x - Math.cos(angle) * tailLen;
        const tailY = b.y - Math.sin(angle) * tailLen;

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
      }

      // --- Players ---
      engine.state.players.forEach((p) => {
        if (p.isDead) return;

        if (p.speedBoostTimer > 0) {
            ctx.fillStyle = '#3b82f6';
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(p.x - Math.cos(p.angle)*15, p.y - Math.sin(p.angle)*15, p.radius - 2, 0, Math.PI*2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        if (p.damageBoostTimer > 0) {
            ctx.strokeStyle = '#d946ef';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius + 5, 0, Math.PI * 2);
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        if (p.invulnerabilityTimer > 0) {
            ctx.save();
            ctx.translate(p.x, p.y);
            const pulse = Math.sin(Date.now() / 100) * 0.2 + 0.8; 
            ctx.rotate(Date.now() / 300); 
            
            ctx.beginPath();
            ctx.arc(0, 0, p.radius + 12, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            ctx.globalAlpha = 0.5 * pulse;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(0, 0, p.radius + 8, 0, Math.PI * 2);
            ctx.fillStyle = '#22d3ee'; 
            ctx.globalAlpha = 0.2 * pulse;
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, -6, 35, 12);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, -6, 35, 12);
        
        ctx.restore();

        ctx.shadowBlur = 20;
        ctx.shadowColor = p.color;
        
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.lineWidth = 3;
        ctx.strokeStyle = p.color;
        ctx.stroke();

        ctx.font = 'bold 14px "Rajdhani", sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(p.name, p.x, p.y - p.radius - 10);

        const hpPct = p.hp / p.maxHp;
        const barW = 40;
        const barH = 4;
        const barX = p.x - barW/2;
        const barY = p.y - p.radius - 8;
        
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : '#ef4444';
        ctx.fillRect(barX, barY, barW * hpPct, barH);
      });

      // Map Borders
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 20;
      ctx.strokeRect(0, 0, MAP_SIZE.width, MAP_SIZE.height);
      ctx.shadowBlur = 0;

      ctx.restore();

      const grad = ctx.createRadialGradient(width/2, height/2, height/2, width/2, height/2, height);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    };

    const loop = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;
      
      // UPDATE INPUT
      const p = engine.state.players.get(myId);
      if (p && !p.isDead) {
         const w = window.innerWidth;
         const h = window.innerHeight;
         // Здесь тоже нужно изменить логику, чтобы прицел не сбивался
         // Так как камера теперь центрирована, позиция игрока на экране ВСЕГДА центр
         const screenX = w / 2;
         const screenY = h / 2;
         
         inputRef.current.facingAngle = Math.atan2(
             inputRef.current.mouseY - screenY, 
             inputRef.current.mouseX - screenX
         );
      }

      engine.update(dt, inputRef.current, myId);
      if (canvasRef.current) {
        const cvs = canvasRef.current;
        const ctx = cvs.getContext('2d');
        if (ctx) {
            if (cvs.width !== window.innerWidth || cvs.height !== window.innerHeight) {
                cvs.width = window.innerWidth;
                cvs.height = window.innerHeight;
            }
            render(ctx, cvs.width, cvs.height);
        }
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
        cancelAnimationFrame(animId);
        clearInterval(uiInterval);
    };
  }, [engine, myId]);

  const myPlayer = engine.state.players.get(myId);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#050505] cursor-crosshair">
      <canvas ref={canvasRef} className="block" />
      {myId && <UI gameState={engine.state} myPlayerId={myId} onExit={onExit} />}
      
      {myPlayer?.isDead && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
          <div className="text-center animate-bounce-slow">
            <h2 className="font-display text-6xl font-black text-red-500 mb-4 tracking-widest neon-text">CRITICAL FAILURE</h2>
            <div className="text-2xl font-mono text-cyan-400">
              SYSTEM REBOOT IN <span className="text-white text-3xl">{Math.ceil(myPlayer.respawnTimer / 1000)}s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};