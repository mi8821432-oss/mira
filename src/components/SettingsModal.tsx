import React from 'react';
import { SessionConfig } from '../types/session.types';
import { soundEffects } from '../utils/streamUtils';
import {
  X,
  Sliders,
  Volume2,
  Mic,
  Palette,
  BellRing,
  Sparkles,
  Shield,
  Radio,
  Cpu,
  Globe,
  CheckCircle2,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SessionConfig;
  onUpdateConfig: (partial: Partial<SessionConfig>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
}) => {
  if (!isOpen) return null;

  const voices: { name: SessionConfig['voiceName']; desc: string; gender: string }[] = [
    { name: 'Kore', desc: 'Warm, witty, highly expressive & natural (Default)', gender: 'Female' },
    { name: 'Aoede', desc: 'Soft, playful, confident cadence', gender: 'Female' },
    { name: 'Zephyr', desc: 'Calm, thoughtful, soothing clarity', gender: 'Neutral' },
    { name: 'Puck', desc: 'Energetic, fast-talking banter', gender: 'Male' },
    { name: 'Fenrir', desc: 'Deep, resonant, commanding presence', gender: 'Male' },
    { name: 'Charon', desc: 'Rich, cinematic, composed tone', gender: 'Male' },
  ];

  const themes: { id: SessionConfig['themeHue']; label: string; color: string }[] = [
    { id: 'violet', label: 'Cyber Violet', color: '#7C3AED' },
    { id: 'cyan', label: 'Neon Cyan', color: '#00E5FF' },
    { id: 'matrix', label: 'Matrix Grid', color: '#10B981' },
    { id: 'amber', label: 'Solar Amber', color: '#F59E0B' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none animate-fade-in">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#090D21] p-6 text-slate-200 shadow-[0_0_50px_rgba(124,58,237,0.25)] relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-sm uppercase tracking-wider font-semibold">
            <Sliders className="w-4 h-4" />
            <span>JARVIS / MYRA SYSTEM CONFIGURATION</span>
          </div>
          <button
            onClick={() => {
              soundEffects.playClickSound();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {/* Persona Selection */}
          <div>
            <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400 mb-2.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>ASSISTANT IDENTITY & PERSONA</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  soundEffects.playClickSound();
                  onUpdateConfig({ assistantPersona: 'jarvis' });
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  config.assistantPersona === 'jarvis'
                    ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200 shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                    : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-sm text-slate-100 flex items-center justify-between">
                  <span>Jarvis (Boss AI)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                    Active
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Addresses you as Boss, fast turn-taking & Urdu/Hindi/English code-switching
                </p>
              </button>

              <button
                onClick={() => {
                  soundEffects.playClickSound();
                  onUpdateConfig({ assistantPersona: 'myra' });
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  config.assistantPersona === 'myra'
                    ? 'border-purple-400 bg-purple-950/40 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                    : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-sm text-slate-100 flex items-center justify-between">
                  <span>Myra (مایرا)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                    Companion
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Playful, witty, intelligent, and warm female companion
                </p>
              </button>
            </div>
          </div>

          {/* Wake Word Activation */}
          <div className="p-3.5 rounded-xl border border-white/5 bg-white/5 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Mic className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-200">
                  Wake Word Activation & Voice Privacy
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Responds when hearing &quot;Hello Jarvis&quot;, &quot;Hey Jarvis&quot;, or &quot;Myra&quot;. Ignores background chatter.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const next = !config.wakeWordEnabled;
                soundEffects.playClickSound();
                onUpdateConfig({ wakeWordEnabled: next });
              }}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 shrink-0 ${
                config.wakeWordEnabled ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  config.wakeWordEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Preferred Language */}
          <div>
            <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400 mb-2.5">
              <Globe className="w-3.5 h-3.5 text-purple-400" />
              <span>VOICE LANGUAGE & CADENCE</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'urdu-english', label: 'Urdu + English', desc: 'Simple Pakistani Urdu & English mix' },
                { id: 'english', label: 'English Only', desc: 'Natural English speech' },
                { id: 'hindi', label: 'Hindi + English', desc: 'Hindi conversational mix' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => {
                    soundEffects.playClickSound();
                    onUpdateConfig({ preferredLanguage: lang.id as any });
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    config.preferredLanguage === lang.id
                      ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200'
                      : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-100">{lang.label}</div>
                  <p className="mt-1 text-[10px] text-slate-400 line-clamp-1">{lang.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Connection Mode Selector */}
          <div>
            <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>CONNECTION ENGINE</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  soundEffects.playClickSound();
                  onUpdateConfig({ connectionMode: 'online' });
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  config.connectionMode === 'online'
                    ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200 shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                    : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-sm text-slate-100 flex items-center justify-between">
                  <span>Online Live</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                    Gemini Live
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">Low-latency Gemini 3.8 real-time voice streaming</p>
              </button>

              <button
                onClick={() => {
                  soundEffects.playClickSound();
                  onUpdateConfig({ connectionMode: 'offline' });
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  config.connectionMode === 'offline'
                    ? 'border-emerald-400 bg-emerald-950/40 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-sm text-slate-100 flex items-center justify-between">
                  <span>Offline Local</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                    No Internet
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">On-device Web Speech & local conversational core</p>
              </button>
            </div>
          </div>

          {/* Feature Availability Indicator */}
          <div className="p-3.5 rounded-xl border border-white/5 bg-black/40 text-xs font-mono space-y-2">
            <div className="text-slate-400 font-semibold flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>OFFLINE / ONLINE CAPABILITY STATUS</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
              <div>
                <span className="text-emerald-400 block font-semibold">Works Offline:</span>
                <ul className="text-slate-400 list-disc list-inside space-y-0.5 mt-0.5 text-[10px]">
                  <li>Voice-to-Voice Conversation</li>
                  <li>WhatsApp & App Launching</li>
                  <li>Urdu/Hindi Poetry & Jokes</li>
                  <li>Reminders & HUD Controls</li>
                  <li>Math, Time, Date & System</li>
                </ul>
              </div>
              <div>
                <span className="text-cyan-400 block font-semibold">Requires Online:</span>
                <ul className="text-slate-400 list-disc list-inside space-y-0.5 mt-0.5 text-[10px]">
                  <li>Gemini Live Model Streaming</li>
                  <li>Real-time Web Searching</li>
                  <li>Cloud Knowledge Queries</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Voice Persona Selection */}
          <div>
            <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>VOICE PERSONA (ONLINE LIVE)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {voices.map((v) => (
                <button
                  key={v.name}
                  onClick={() => {
                    soundEffects.playClickSound();
                    onUpdateConfig({ voiceName: v.name });
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    config.voiceName === v.name
                      ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200 shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                      : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-100">{v.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                      {v.gender}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-1">{v.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Theme Hue */}
          <div>
            <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400 mb-2.5">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <span>HUD AMBIENT LIGHTING</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    soundEffects.playClickSound();
                    onUpdateConfig({ themeHue: t.id });
                  }}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium transition-all ${
                    config.themeHue === t.id
                      ? 'border-white/40 bg-white/10 text-white'
                      : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/15'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Audio Sensitivity Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
                <Mic className="w-3.5 h-3.5 text-purple-400" />
                <span>MICROPHONE SENSITIVITY & NOISE GATE</span>
              </label>
              <span className="text-xs font-mono text-cyan-400">
                {Math.round(config.audioSensitivity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={config.audioSensitivity}
              onChange={(e) => onUpdateConfig({ audioSensitivity: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>Higher Noise Filter</span>
              <span>Whisper Sensitive</span>
            </div>
          </div>

          {/* Audio Synthesizer SFX Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5">
            <div className="flex items-center gap-3">
              <BellRing className="w-4 h-4 text-cyan-400" />
              <div>
                <p className="text-sm font-medium text-slate-200">Synthesized HUD Sound FX</p>
                <p className="text-xs text-slate-400">
                  Real-time crystalline beeps, interruption bursts & chimes
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const next = !config.soundEffectsEnabled;
                soundEffects.enabled = next;
                if (next) soundEffects.playConnectSound();
                onUpdateConfig({ soundEffectsEnabled: next });
              }}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                config.soundEffectsEnabled ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  config.soundEffectsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={() => {
              soundEffects.playClickSound();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs uppercase tracking-wider font-semibold transition-colors shadow-lg"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
