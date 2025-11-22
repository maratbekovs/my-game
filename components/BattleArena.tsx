import React, { useEffect, useRef, useState } from 'react';
import { useGameEngine } from '../services/GameContext';
import { InputState, PowerUpType } from '../types';
import { OBSTACLES, POWERUP_RADIUS, MAP_SIZE } from '../constants';
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
  const [buffNotifications, setBuffNotifications] = useState<{id: number, text: string}[]>([]);
  
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

    if (engine.socket) {
        engine.socket.on('buff_alert', (msg: string) => {
            const id = Date.now();
            setBuffNotifications(prev => {
                const newState = [{id, text: msg}, ...prev];
                return newState.slice(0, 3);
            });
            
            setTimeout(() => {
                setBuffNotifications(prev => prev.filter(n => n.id !== id));
            }, 4000);
        });
    }

    return () => { 
        clearInterval(waitForId);
        if (engine.socket) engine.socket.off('buff_alert');
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

      const targetCamX = myPlayer.x - width / 2;
      const targetCamY = myPlayer.y - height / 2;
      
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(-targetCamX, -targetCamY);

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

        if (p.isBoss) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Date.now() / 1000);
            ctx.strokeStyle = '#b91c1c';
            ctx.lineWidth = 4;
            ctx.setLineDash([20, 10]);
            ctx.beginPath();
            ctx.arc(0, 0, p.radius + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
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
        
        ctx.fillStyle = p.isBoss ? '#7f1d1d' : '#334155';
        const gunW = p.isBoss ? 60 : 35;
        const gunH = p.isBoss ? 20 : 12;
        ctx.fillRect(0, -gunH/2, gunW, gunH);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, -gunH/2, gunW, gunH);
        
        ctx.restore();

        ctx.shadowBlur = p.isBoss ? 50 : 20;
        ctx.shadowColor = p.color;
        
        ctx.fillStyle = p.isBoss ? '#450a0a' : '#0f172a';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.lineWidth = p.isBoss ? 6 : 3;
        ctx.strokeStyle = p.color;
        ctx.stroke();

        ctx.font = p.isBoss ? 'bold 24px "Orbitron"' : 'bold 14px "Rajdhani", sans-serif';
        ctx.fillStyle = p.isBoss ? '#f87171' : '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(p.name, p.x, p.y - p.radius - (p.isBoss ? 20 : 10));

        const hpPct = Math.max(0, p.hp / p.maxHp);
        const barW = p.isBoss ? 120 : 40;
        const barH = p.isBoss ? 10 : 4;
        const barX = p.x - barW/2;
        const barY = p.y - p.radius - (p.isBoss ? 15 : 8);
        
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : '#ef4444';
        ctx.fillRect(barX, barY, barW * hpPct, barH);
      });

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
      
      const p = engine.state.players.get(myId);
      if (p && !p.isDead) {
         const w = window.innerWidth;
         const h = window.innerHeight;
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
      
      {myId && <UI gameState={engine.state} myPlayerId={myId} onExit={onExit} buffNotifications={buffNotifications} />}
      
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