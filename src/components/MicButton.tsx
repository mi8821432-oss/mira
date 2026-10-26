import React from 'react';
import { Mic, MicOff, PhoneCall, PhoneOff, RefreshCw } from 'lucide-react';
import { VoiceState } from '../types/session.types';
import { soundEffects } from '../utils/streamUtils';

interface MicButtonProps {
  state: VoiceState;
  isMuted: boolean;
  onToggleSession: () => void;
  onToggleMute: () => void;
  disabled?: boolean;
}

export const MicButton: React.FC<MicButtonProps> = ({
  state,
  isMuted,
  onToggleSession,
  onToggleMute,
  disabled = false,
}) => {
  const isConnected = state !== 'disconnected' && state !== 'error';

  const handleSessionClick = () => {
    soundEffects.playClickSound();
    onToggleSession();
  };

  const handleMuteClick = () => {
    soundEffects.playClickSound();
    onToggleMute();
  };

  return (
    <div className="flex items-center gap-4 select-none">
      {/* Mute / Unmute Button (when connected) */}
      {isConnected && (
        <button
          onClick={handleMuteClick}
          disabled={disabled}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          className={`flex items-center justify-center w-12 h-12 rounded-full border transition-all duration-200 backdrop-blur-md shadow-lg ${
            isMuted
              ? 'border-red-500/50 bg-red-950/40 text-red-400 hover:bg-red-900/60 shadow-red-500/20'
              : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:border-cyan-500/40 shadow-cyan-500/10'
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-cyan-400" />}
        </button>
      )}

      {/* Main Connection Trigger Button */}
      <button
        onClick={handleSessionClick}
        disabled={disabled || state === 'connecting' || state === 'reconnecting'}
        className={`relative flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full font-mono text-sm uppercase tracking-wider font-semibold transition-all duration-300 shadow-2xl backdrop-blur-xl border ${
          state === 'connecting' || state === 'reconnecting'
            ? 'border-cyan-500/50 bg-cyan-950/50 text-cyan-300 shadow-cyan-500/30'
            : isConnected
            ? 'border-rose-500/40 bg-gradient-to-r from-rose-950/80 to-purple-950/80 text-rose-200 hover:border-rose-400 hover:text-white shadow-rose-500/20'
            : 'border-cyan-400/60 bg-gradient-to-r from-violet-600/90 via-purple-600/90 to-cyan-600/90 text-white hover:brightness-110 shadow-purple-600/30'
        }`}
      >
        {state === 'connecting' || state === 'reconnecting' ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span>CONNECTING...</span>
          </>
        ) : isConnected ? (
          <>
            <PhoneOff className="w-4 h-4 text-rose-400" />
            <span>DISCONNECT</span>
          </>
        ) : (
          <>
            <PhoneCall className="w-4 h-4 text-white" />
            <span>START MYRA SESSION</span>
          </>
        )}
      </button>
    </div>
  );
};
