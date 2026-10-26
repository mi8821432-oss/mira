import React from 'react';
import { SessionStats, VoiceState } from '../types/session.types';
import { Cpu, Shield, Waves, Zap } from 'lucide-react';

interface HudTelemetryProps {
  state: VoiceState;
  stats: SessionStats;
  voiceName: string;
  themeHue?: string;
}

export const HudTelemetry: React.FC<HudTelemetryProps> = ({
  state,
  stats,
  voiceName,
}) => {
  const isConnected = state !== 'disconnected';
  const isOffline = stats.mode === 'offline';

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <>
      {/* Top Left HUD Telemetry Box */}
      <div className="hidden md:flex flex-col gap-1 p-3 rounded-lg border border-white/5 bg-black/30 backdrop-blur-md font-mono text-[11px] text-slate-400 select-none pointer-events-none shadow-lg">
        <div className="flex items-center gap-1.5 text-cyan-400 font-semibold tracking-wider">
          <Cpu className="w-3.5 h-3.5" />
          <span>MYRA CORE v3.8 (مایرا)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-slate-500">VOICE:</span>
          <span className="text-purple-300 font-medium">
            {isOffline ? 'LOCAL SYNTH (OFFLINE)' : `${voiceName} (LIVE)`}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-slate-500">ENGINE:</span>
          <span className={isOffline ? 'text-emerald-400 font-medium' : 'text-cyan-300 font-medium'}>
            {isOffline ? 'LOCAL ON-DEVICE ENGINE' : 'GEMINI 3.8 LIVE'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-slate-500">STATUS:</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <Shield className="w-2.5 h-2.5" /> {isOffline ? 'ZERO LATENCY' : 'SECURE PCM16'}
          </span>
        </div>
      </div>

      {/* Top Right Audio Telemetry */}
      <div className="hidden md:flex flex-col gap-1 p-3 rounded-lg border border-white/5 bg-black/30 backdrop-blur-md font-mono text-[11px] text-slate-400 select-none pointer-events-none shadow-lg">
        <div className="flex items-center gap-1.5 text-purple-400 font-semibold tracking-wider">
          <Waves className="w-3.5 h-3.5" />
          <span>AUDIO PIPELINE</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-slate-400">
          <span className="text-slate-500">INPUT:</span>
          <span className="text-slate-300">
            {isOffline ? 'WEB SPEECH API' : '16,000 Hz / Mono'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 text-slate-400">
          <span className="text-slate-500">OUTPUT:</span>
          <span className="text-cyan-300">
            {isOffline ? 'VOICE SYNTHESIS' : '24,000 Hz / LE'}
          </span>
        </div>
        {isConnected && !isOffline && (
          <div className="flex items-center justify-between gap-4 text-slate-400 pt-0.5 border-t border-white/5">
            <span className="text-slate-500">STREAM:</span>
            <span className="text-slate-400 font-mono">
              ↑{formatBytes(stats.bytesSent)} ↓{formatBytes(stats.bytesReceived)}
            </span>
          </div>
        )}
      </div>
    </>
  );
};
