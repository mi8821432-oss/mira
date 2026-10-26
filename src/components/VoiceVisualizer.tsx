import React from 'react';
import { VoiceState } from '../types/session.types';
import { AudioWaveform } from './AudioWaveform';
import { Mic, Volume2 } from 'lucide-react';

interface VoiceVisualizerProps {
  state: VoiceState;
  inputLevel: number;
  outputLevel: number;
  inputFrequencies: Uint8Array;
  outputFrequencies: Uint8Array;
  isMuted: boolean;
  themeHue?: 'violet' | 'cyan' | 'matrix' | 'amber';
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  state,
  inputLevel,
  outputLevel,
  inputFrequencies,
  outputFrequencies,
  isMuted,
  themeHue = 'violet',
}) => {
  const isNoiraSpeaking = state === 'speaking';
  const isUserSpeaking = state === 'listening' && inputLevel > 0.04 && !isMuted;

  const activeColor = isNoiraSpeaking ? '#00E5FF' : isUserSpeaking ? '#A855F7' : '#64748B';
  const activeGlow = isNoiraSpeaking ? '#7C3AED' : isUserSpeaking ? '#EC4899' : '#1E293B';

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md px-4 select-none">
      <div className="flex items-center gap-2 mb-1 text-[11px] font-mono tracking-widest text-slate-400 uppercase">
        {isNoiraSpeaking ? (
          <span className="flex items-center gap-1.5 text-cyan-400 font-semibold animate-pulse">
            <Volume2 className="w-3.5 h-3.5" /> MYRA AUDIO OUT (VOICE)
          </span>
        ) : isUserSpeaking ? (
          <span className="flex items-center gap-1.5 text-purple-400 font-semibold animate-pulse">
            <Mic className="w-3.5 h-3.5" /> USER VOICE IN (16 kHz)
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-slate-500">
            <Mic className="w-3.5 h-3.5" /> AUDIO PIPELINE STANDBY
          </span>
        )}
      </div>

      <AudioWaveform
        frequencies={isNoiraSpeaking ? outputFrequencies : inputFrequencies}
        level={isNoiraSpeaking ? outputLevel : inputLevel}
        isActive={isNoiraSpeaking || isUserSpeaking}
        color={activeColor}
        glowColor={activeGlow}
        barCount={36}
        height={36}
      />
    </div>
  );
};
