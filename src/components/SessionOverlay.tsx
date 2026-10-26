import React from 'react';
import { VoiceState } from '../types/session.types';
import { Sparkles } from 'lucide-react';

interface SessionOverlayProps {
  state: VoiceState;
  currentSubtitle: string;
  errorMessage: string | null;
  onDismissError: () => void;
  permissionDenied: boolean;
}

export const SessionOverlay: React.FC<SessionOverlayProps> = ({
  state,
  currentSubtitle,
  errorMessage,
  onDismissError,
  permissionDenied,
}) => {
  return (
    <div className="w-full max-w-2xl px-6 flex flex-col items-center justify-center text-center select-none pointer-events-none">
      {/* Microphone Permission Warning */}
      {permissionDenied && (
        <div className="pointer-events-auto mb-4 p-4 rounded-xl border border-rose-500/40 bg-rose-950/80 backdrop-blur-xl text-rose-200 text-sm max-w-md shadow-2xl flex flex-col items-center gap-2">
          <div className="font-semibold text-rose-100 flex items-center gap-2">
            Microphone Access Required
          </div>
          <p className="text-xs text-rose-300 leading-relaxed text-center">
            Jarvis / Myra (مایرا) needs microphone access to hear your voice. Please allow microphone permissions in your browser bar, or use the backup text input below!
          </p>
        </div>
      )}

      {/* Connection or Runtime Error Banner */}
      {errorMessage && !permissionDenied && (
        <div className="pointer-events-auto mb-4 p-3.5 rounded-xl border border-amber-500/40 bg-amber-950/80 backdrop-blur-xl text-amber-200 text-xs max-w-md shadow-2xl flex items-center justify-between gap-3">
          <p className="leading-relaxed text-left">{errorMessage}</p>
          <button
            onClick={onDismissError}
            className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono text-[10px] uppercase tracking-wider"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Real-time Voice Caption / Subtitle HUD Banner */}
      {state === 'speaking' && currentSubtitle && (
        <div className="animate-fade-in p-4 rounded-2xl border border-cyan-500/25 bg-black/60 backdrop-blur-xl max-w-xl shadow-[0_0_25px_rgba(0,229,255,0.15)] flex items-start gap-3 text-left">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
          <p className="text-sm font-sans tracking-wide text-cyan-100/90 leading-relaxed font-normal">
            &ldquo;{currentSubtitle}&rdquo;
          </p>
        </div>
      )}

      {/* Idle Prompt when disconnected */}
      {state === 'disconnected' && (
        <div className="text-center space-y-1">
          <h2 className="text-lg md:text-xl font-light tracking-wide text-slate-200 font-sans">
            &ldquo;Speak Naturally. Feel Understood.&rdquo;
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Tap the orb to speak with Myra (مایرا) — online or offline
          </p>
        </div>
      )}
    </div>
  );
};
