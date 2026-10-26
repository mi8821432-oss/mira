import React, { useState } from 'react';
import { ReminderItem, SmartDeviceState } from '../types/tool.types';
import { LiveTranscriptItem, SessionStats } from '../types/session.types';
import { soundEffects } from '../utils/streamUtils';
import {
  X,
  Clock,
  Trash2,
  SlidersHorizontal,
  FileText,
  Activity,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';

interface DiagnosticsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  reminders: ReminderItem[];
  onDeleteReminder: (id: string) => void;
  deviceState: SmartDeviceState;
  transcripts: LiveTranscriptItem[];
  stats: SessionStats;
}

export const DiagnosticsDrawer: React.FC<DiagnosticsDrawerProps> = ({
  isOpen,
  onClose,
  reminders,
  onDeleteReminder,
  deviceState,
  transcripts,
  stats,
}) => {
  const [activeTab, setActiveTab] = useState<'reminders' | 'transcript' | 'system'>('reminders');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-[#080C1E]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col text-slate-200 select-none animate-slide-left">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider font-semibold">
          <Layers className="w-4 h-4" />
          <span>HUD DIAGNOSTICS & SYSTEM</span>
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

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-black/20 text-xs font-mono">
        <button
          onClick={() => setActiveTab('reminders')}
          className={`flex-1 py-3 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'reminders'
              ? 'border-cyan-400 text-cyan-400 font-semibold bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>REMINDERS ({reminders.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('transcript')}
          className={`flex-1 py-3 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'transcript'
              ? 'border-purple-400 text-purple-400 font-semibold bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>LOG ({transcripts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`flex-1 py-3 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'system'
              ? 'border-emerald-400 text-emerald-400 font-semibold bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>SYS STATUS</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === 'reminders' && (
          <div>
            {reminders.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-mono">
                No active reminders.
                <p className="mt-1 text-slate-600">
                  Say &quot;NOIRA, remind me to check emails at 5pm&quot; to test.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {reminders.map((rem) => (
                  <div
                    key={rem.id}
                    className="p-3 rounded-xl border border-white/5 bg-white/5 flex items-center justify-between gap-3 group hover:border-cyan-500/30 transition-all"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-200">{rem.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-cyan-400">
                        <Clock className="w-3 h-3" />
                        <span>{rem.time}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteReminder(rem.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                      title="Delete reminder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'transcript' && (
          <div>
            {transcripts.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-mono">
                Session transcript buffer is empty.
              </div>
            ) : (
              <div className="space-y-2.5">
                {transcripts.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      t.sender === 'user'
                        ? 'border-purple-500/20 bg-purple-950/20 text-purple-100'
                        : 'border-cyan-500/20 bg-cyan-950/20 text-cyan-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 font-mono text-[10px] text-slate-400">
                      <span className="font-semibold uppercase tracking-wider">
                        {t.sender === 'user' ? 'YOU' : 'MYRA (مایرا)'}
                      </span>
                      <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p>{t.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-4">
            {/* Smart Cyber State */}
            <div className="p-3.5 rounded-xl border border-white/5 bg-white/5 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider font-semibold">
                <Zap className="w-3.5 h-3.5" />
                <span>SMART DEVICE GRID</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                <div className="p-2 rounded bg-black/40 border border-white/5">
                  <span className="text-slate-500 block text-[10px]">AMBIENT LIGHT</span>
                  <span className="text-purple-300 font-semibold">{deviceState.ambientLight}</span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/5">
                  <span className="text-slate-500 block text-[10px]">OVERDRIVE</span>
                  <span
                    className={
                      deviceState.overdriveMode
                        ? 'text-emerald-400 font-semibold'
                        : 'text-slate-400'
                    }
                  >
                    {deviceState.overdriveMode ? 'ENGAGED' : 'OFF'}
                  </span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/5">
                  <span className="text-slate-500 block text-[10px]">SECURITY GRID</span>
                  <span className="text-cyan-400 font-semibold">ACTIVE</span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/5">
                  <span className="text-slate-500 block text-[10px]">STEALTH MODE</span>
                  <span className="text-slate-400">
                    {deviceState.stealthMode ? 'ONLINE' : 'STANDBY'}
                  </span>
                </div>
              </div>
            </div>

            {/* Audio Buffer Metrics */}
            <div className="p-3.5 rounded-xl border border-white/5 bg-white/5 space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-mono text-xs uppercase tracking-wider font-semibold">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>REALTIME BUFFER STATS</span>
              </div>
              <div className="space-y-1.5 font-mono text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Latency:</span>
                  <span className="text-cyan-400">{stats.latencyMs} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Packets In/Out:</span>
                  <span>
                    {stats.packetsReceived} / {stats.packetsSent}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Input Sample Rate:</span>
                  <span>16,000 Hz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Output Sample Rate:</span>
                  <span>24,000 Hz</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
