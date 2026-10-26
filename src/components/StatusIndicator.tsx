import React from 'react';
import { VoiceState, ConnectionMode } from '../types/session.types';
import { Activity, Radio, Wifi, WifiOff, Cpu } from 'lucide-react';
import { soundEffects } from '../utils/streamUtils';

interface StatusIndicatorProps {
  state: VoiceState;
  latencyMs: number;
  sessionDuration: number;
  mode?: ConnectionMode;
  isSystemOnline?: boolean;
  onToggleMode?: () => void;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  state,
  latencyMs,
  sessionDuration,
  mode = 'online',
  isSystemOnline = true,
  onToggleMode,
}) => {
  const isConnected = state !== 'disconnected' && state !== 'error';
  const isOfflineMode = mode === 'offline' || !isSystemOnline;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleToggle = () => {
    soundEffects.playClickSound();
    onToggleMode?.();
  };

  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-white/10 bg-black/50 backdrop-blur-md font-mono text-xs text-slate-300 shadow-md select-none">
      {/* Mode Status Pill with Clickable Switch */}
      <button
        onClick={handleToggle}
        title={`Current mode: ${isOfflineMode ? 'OFFLINE (Local Core)' : 'ONLINE (Gemini Live)'}. Click to switch.`}
        className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider transition-all border ${
          isOfflineMode
            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
            : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40 hover:bg-cyan-900/60 shadow-[0_0_10px_rgba(0,229,255,0.2)]'
        }`}
      >
        {isOfflineMode ? (
          <>
            <Cpu className="w-3 h-3 text-emerald-400" />
            <span>OFFLINE LOCAL</span>
          </>
        ) : (
          <>
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>ONLINE LIVE</span>
          </>
        )}
      </button>

      {/* Connection State Indicator */}
      <div className="flex items-center gap-1.5 text-[11px]">
        {isConnected ? (
          <span className="text-white font-medium">ACTIVE</span>
        ) : (
          <span className="text-slate-500">STANDBY</span>
        )}
      </div>

      <div className="w-[1px] h-3 bg-white/15" />

      {/* Latency ping */}
      <div className="flex items-center gap-1 text-[11px] text-slate-400" title="Processing Latency">
        <Activity className={`w-3 h-3 ${isOfflineMode ? 'text-emerald-400' : 'text-purple-400'}`} />
        <span>{isConnected ? `${latencyMs}ms` : '--'}</span>
      </div>

      {isConnected && (
        <>
          <div className="w-[1px] h-3 bg-white/15" />
          <div className="text-[11px] text-slate-300 font-mono">
            {formatDuration(sessionDuration)}
          </div>
        </>
      )}
    </div>
  );
};
