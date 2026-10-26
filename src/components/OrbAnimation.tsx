import React, { useEffect, useRef } from 'react';
import { VoiceState } from '../types/session.types';

interface OrbAnimationProps {
  state: VoiceState;
  inputLevel: number;
  outputLevel: number;
  inputFrequencies: Uint8Array;
  outputFrequencies: Uint8Array;
  onClick: () => void;
  isMuted: boolean;
  themeHue?: 'violet' | 'cyan' | 'matrix' | 'amber';
}

export const OrbAnimation: React.FC<OrbAnimationProps> = ({
  state,
  inputLevel,
  outputLevel,
  inputFrequencies,
  outputFrequencies,
  onClick,
  isMuted,
  themeHue = 'violet',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Theme color palette mapping
  const colorMap = {
    violet: {
      primary: '#7C3AED',
      secondary: '#00E5FF',
      glow: '#A855F7',
      rgbCore: '168, 85, 247',
      rgbAccent: '0, 229, 255',
    },
    cyan: {
      primary: '#00D2FF',
      secondary: '#3B82F6',
      glow: '#00F0FF',
      rgbCore: '0, 240, 255',
      rgbAccent: '59, 130, 246',
    },
    matrix: {
      primary: '#10B981',
      secondary: '#06B6D4',
      glow: '#34D399',
      rgbCore: '52, 211, 153',
      rgbAccent: '6, 182, 212',
    },
    amber: {
      primary: '#F59E0B',
      secondary: '#EC4899',
      glow: '#FBBF24',
      rgbCore: '251, 191, 36',
      rgbAccent: '236, 72, 153',
    },
  }[themeHue];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let rotation = 0;
    let pulsePhase = 0;

    // Particle nodes for ambient floating quantum dust
    const particleCount = 36;
    const particles = Array.from({ length: particleCount }, () => ({
      angle: Math.random() * Math.PI * 2,
      distance: 60 + Math.random() * 80,
      size: 1 + Math.random() * 2.5,
      speed: (Math.random() * 0.008 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
      opacity: 0.2 + Math.random() * 0.6,
    }));

    const render = () => {
      // Resize for DPI crispness
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * 2 || canvas.height !== height * 2) {
        canvas.width = width * 2;
        canvas.height = height * 2;
      }

      ctx.save();
      ctx.scale(2, 2);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Base radius scaled for mobile/desktop
      const baseRadius = Math.min(width, height) * 0.24;

      pulsePhase += 0.035;
      rotation += state === 'thinking' ? 0.08 : state === 'speaking' ? 0.04 : 0.015;

      // Reactivity values
      const currentLevel = state === 'speaking' ? outputLevel : state === 'listening' ? inputLevel : 0;
      const dynamicScale = 1 + currentLevel * 0.45;
      const coreRadius = baseRadius * dynamicScale;

      // 1. Draw outer ambient particle dust
      particles.forEach((p) => {
        p.angle += p.speed * (state === 'speaking' ? 2 : 1);
        const pDist = p.distance * (1 + currentLevel * 0.5);
        const px = centerX + Math.cos(p.angle) * pDist;
        const py = centerY + Math.sin(p.angle) * pDist;

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colorMap.rgbAccent}, ${p.opacity * (0.3 + currentLevel * 0.7)})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = colorMap.glow;
        ctx.fill();
      });

      // 2. Draw rotating HUD orbital rings
      const ringCount = 3;
      for (let r = 0; r < ringCount; r++) {
        const ringRadius = baseRadius * (1.35 + r * 0.22) + Math.sin(pulsePhase + r) * 4;
        const ringAngle = rotation * (r % 2 === 0 ? 1 : -1) * (0.6 + r * 0.3);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(ringAngle);

        ctx.beginPath();
        // Dashed sci-fi arc
        const dashLen = state === 'connecting' || state === 'thinking' ? 12 : 6;
        ctx.setLineDash([dashLen, 14, 28, 8]);
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle =
          state === 'speaking'
            ? `rgba(${colorMap.rgbAccent}, 0.75)`
            : state === 'listening'
            ? `rgba(${colorMap.rgbCore}, 0.5)`
            : `rgba(148, 163, 184, 0.2)`;
        ctx.shadowBlur = state === 'speaking' || state === 'thinking' ? 14 : 4;
        ctx.shadowColor = colorMap.glow;
        ctx.stroke();

        // Little HUD tick marks
        if (state === 'thinking' || state === 'speaking') {
          for (let tick = 0; tick < 4; tick++) {
            const tAngle = (Math.PI / 2) * tick;
            const tx = Math.cos(tAngle) * ringRadius;
            const ty = Math.sin(tAngle) * ringRadius;
            ctx.beginPath();
            ctx.arc(tx, ty, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = colorMap.secondary;
            ctx.fill();
          }
        }
        ctx.restore();
      }

      // 3. Audio reactive wave pulse rings (When Speaking or Listening)
      if (state === 'speaking' || state === 'listening') {
        const waveRings = 3;
        for (let i = 0; i < waveRings; i++) {
          const wavePhase = (pulsePhase * 1.5 + (i * Math.PI) / 1.5) % (Math.PI * 2);
          const expandRadius = coreRadius + (wavePhase / (Math.PI * 2)) * 55;
          const alpha = Math.max(0, 1 - wavePhase / (Math.PI * 2)) * (0.2 + currentLevel * 0.8);

          ctx.beginPath();
          ctx.arc(centerX, centerY, expandRadius, 0, Math.PI * 2);
          ctx.lineWidth = 1.8;
          ctx.strokeStyle =
            state === 'speaking'
              ? `rgba(${colorMap.rgbAccent}, ${alpha})`
              : `rgba(${colorMap.rgbCore}, ${alpha})`;
          ctx.stroke();
        }
      }

      // 4. Reactive Holographic Frequency Wave Ribbon (Around Core)
      const freqs = state === 'speaking' ? outputFrequencies : inputFrequencies;
      const pointCount = 48;
      ctx.beginPath();
      for (let i = 0; i <= pointCount; i++) {
        const angle = (i / pointCount) * Math.PI * 2 + rotation;
        const freqIndex = i % freqs.length;
        const freqVal = (freqs[freqIndex] || 0) / 255;
        const displacement =
          Math.sin(angle * 6 + pulsePhase * 2) * 5 +
          freqVal * (state === 'speaking' ? 24 : 14);
        const r = coreRadius + displacement;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = `rgba(${colorMap.rgbAccent}, ${state === 'speaking' ? 0.9 : 0.6})`;
      ctx.shadowBlur = 18;
      ctx.shadowColor = colorMap.secondary;
      ctx.stroke();

      // 5. Luminescent Core Gradient Orb
      const coreGrad = ctx.createRadialGradient(
        centerX - coreRadius * 0.25,
        centerY - coreRadius * 0.25,
        coreRadius * 0.08,
        centerX,
        centerY,
        coreRadius
      );

      if (state === 'speaking') {
        coreGrad.addColorStop(0, '#FFFFFF');
        coreGrad.addColorStop(0.3, colorMap.secondary);
        coreGrad.addColorStop(0.7, colorMap.primary);
        coreGrad.addColorStop(1, 'rgba(5, 8, 22, 0.85)');
      } else if (state === 'thinking') {
        coreGrad.addColorStop(0, '#FFFFFF');
        coreGrad.addColorStop(0.3, colorMap.glow);
        coreGrad.addColorStop(0.7, colorMap.primary);
        coreGrad.addColorStop(1, 'rgba(124, 58, 237, 0.4)');
      } else if (state === 'listening') {
        coreGrad.addColorStop(0, '#E0F2FE');
        coreGrad.addColorStop(0.4, colorMap.glow);
        coreGrad.addColorStop(0.8, colorMap.primary);
        coreGrad.addColorStop(1, 'rgba(5, 8, 22, 0.8)');
      } else if (state === 'connecting' || state === 'reconnecting') {
        coreGrad.addColorStop(0, '#BAE6FD');
        coreGrad.addColorStop(0.5, colorMap.secondary);
        coreGrad.addColorStop(1, 'rgba(15, 23, 42, 0.8)');
      } else if (state === 'interrupted') {
        coreGrad.addColorStop(0, '#F43F5E');
        coreGrad.addColorStop(0.5, '#BE123C');
        coreGrad.addColorStop(1, 'rgba(5, 8, 22, 0.9)');
      } else if (state === 'error') {
        coreGrad.addColorStop(0, '#EF4444');
        coreGrad.addColorStop(0.6, '#991B1B');
        coreGrad.addColorStop(1, 'rgba(15, 23, 42, 0.9)');
      } else {
        // Idle
        coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        coreGrad.addColorStop(0.35, colorMap.primary);
        coreGrad.addColorStop(0.75, 'rgba(124, 58, 237, 0.3)');
        coreGrad.addColorStop(1, 'rgba(5, 8, 22, 0.9)');
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowBlur = state === 'speaking' ? 36 : state === 'listening' ? 26 : 18;
      ctx.shadowColor = state === 'error' ? '#EF4444' : colorMap.glow;
      ctx.fill();

      // 6. Central Energy Specular Glint & Quantum Core
      ctx.beginPath();
      const innerCoreR = coreRadius * 0.28 * (1 + Math.sin(pulsePhase * 2) * 0.15);
      ctx.arc(centerX, centerY, innerCoreR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#FFFFFF';
      ctx.fill();

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, inputLevel, outputLevel, inputFrequencies, outputFrequencies, isMuted, colorMap]);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Myra (مایرا) Assistant Status: ${state}. Tap to toggle.`}
      className="relative flex items-center justify-center cursor-pointer select-none group transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
      style={{ width: '100%', maxWidth: '380px', height: '380px' }}
    >
      {/* Background Soft Neon Radial Glow */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-700 blur-3xl"
        style={{
          background: `radial-gradient(circle, ${colorMap.glow}33 0%, ${colorMap.primary}15 50%, transparent 75%)`,
          opacity: state === 'speaking' ? 0.9 : state === 'listening' ? 0.7 : 0.45,
        }}
      />

      <canvas
        ref={canvasRef}
        className="w-full h-full relative z-10"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Floating State Badge Center Bottom */}
      <div className="absolute bottom-2 z-20 flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/10 bg-black/60 backdrop-blur-md text-[11px] font-mono tracking-wider text-slate-300 shadow-lg">
        <span
          className="w-2 h-2 rounded-full animate-pulse"
          style={{
            backgroundColor:
              state === 'speaking'
                ? colorMap.secondary
                : state === 'listening'
                ? colorMap.glow
                : state === 'thinking'
                ? '#F59E0B'
                : state === 'error'
                ? '#EF4444'
                : '#94A3B8',
          }}
        />
        <span className="uppercase font-medium">
          {state === 'disconnected'
            ? 'TAP TO CONNECT'
            : state === 'speaking'
            ? 'MYRA SPEAKING'
            : state === 'listening'
            ? isMuted
              ? 'MIC MUTED'
              : 'LISTENING...'
            : state === 'thinking'
            ? 'PROCESSING...'
            : state === 'connecting'
            ? 'SYNCHRONIZING...'
            : state === 'interrupted'
            ? 'STANDBY'
            : state}
        </span>
      </div>
    </div>
  );
};
