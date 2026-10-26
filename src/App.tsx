/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useGeminiSession } from './hooks/useGeminiSession';
import { OrbAnimation } from './components/OrbAnimation';
import { VoiceVisualizer } from './components/VoiceVisualizer';
import { MicButton } from './components/MicButton';
import { StatusIndicator } from './components/StatusIndicator';
import { HudTelemetry } from './components/HudTelemetry';
import { SessionOverlay } from './components/SessionOverlay';
import { VoiceRecorderBox } from './components/VoiceRecorderBox';
import { ToolCallNotification } from './components/ToolCallNotification';
import { SettingsModal } from './components/SettingsModal';
import { DiagnosticsDrawer } from './components/DiagnosticsDrawer';
import { soundEffects } from './utils/streamUtils';
import {
  Settings,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Mic,
  Shield,
} from 'lucide-react';

export default function App() {
  const {
    state,
    config,
    stats,
    transcripts,
    currentSubtitle,
    reminders,
    deviceState,
    recentToolRecord,
    isMuted,
    permissionDenied,
    inputLevel,
    inputFrequencies,
    outputLevel,
    outputFrequencies,
    errorMessage,
    isSystemOnline,
    connectionMode,
    startSession,
    endSession,
    toggleMute,
    updateConfig,
    setConnectionMode,
    sendTextMessage,
    toggleWakeWord,
    togglePersona,
    deleteReminder,
    clearRecentTool,
    dismissError,
  } = useGeminiSession();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    soundEffects.playClickSound();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleOrbClick = () => {
    if (state === 'disconnected' || state === 'error') {
      startSession();
    } else if (state === 'listening' || state === 'speaking') {
      toggleMute();
    }
  };

  const handleToggleConnectionMode = () => {
    const nextMode = connectionMode === 'online' ? 'offline' : 'online';
    setConnectionMode(nextMode);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden hud-grid-background flex flex-col justify-between text-white select-none">
      {/* Sci-fi HUD Scanning Line */}
      <div className="hud-scanline" />

      {/* Sci-Fi HUD Corner Reticles */}
      <div className="hud-reticle-tl" />
      <div className="hud-reticle-tr" />
      <div className="hud-reticle-bl" />
      <div className="hud-reticle-br" />

      {/* TOP HUD BAR */}
      <header className="relative z-20 w-full px-6 py-4 flex items-center justify-between border-b border-white/5 backdrop-blur-sm">
        {/* Brand Identity & Quick Persona Switch */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundEffects.playClickSound();
              togglePersona();
            }}
            title="Click to switch Persona: Jarvis (Boss AI) <-> Myra (مایرا)"
            className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 p-[1px] shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:scale-105 transition-transform"
          >
            <div className="w-full h-full rounded-xl bg-[#070B1E] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-widest uppercase font-mono text-white flex items-center gap-1.5">
                {config.assistantPersona === 'jarvis' ? (
                  <>
                    <span>JARVIS</span>
                    <span className="text-cyan-400 font-mono text-[11px] font-normal tracking-normal">(BOSS AI)</span>
                  </>
                ) : (
                  <>
                    <span>MYRA</span>
                    <span className="text-purple-400 font-sans text-xs font-normal">(مایرا)</span>
                  </>
                )}
              </h1>

              {/* Mode indicator pill */}
              <button
                onClick={handleToggleConnectionMode}
                title="Click to toggle Online Live vs Offline Local mode"
                className={`hidden sm:inline-block cursor-pointer px-2 py-0.5 rounded text-[10px] font-mono tracking-wider font-semibold border transition-all ${
                  connectionMode === 'offline'
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                    : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(0,229,255,0.2)]'
                }`}
              >
                {connectionMode === 'offline' ? 'OFFLINE' : 'ONLINE LIVE'}
              </button>

              {/* Wake Word indicator pill */}
              <button
                onClick={() => {
                  soundEffects.playClickSound();
                  toggleWakeWord();
                }}
                title={`Wake Word: Say "Hello Jarvis" or "Hey Jarvis" to activate. Currently ${config.wakeWordEnabled ? 'ENABLED' : 'OFF'}. Click to toggle.`}
                className={`hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider font-semibold border transition-all ${
                  config.wakeWordEnabled
                    ? 'bg-purple-950/70 text-purple-300 border-purple-500/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.2)]'
                    : 'bg-white/5 text-slate-500 border-white/10 hover:border-white/20'
                }`}
              >
                <Mic className="w-2.5 h-2.5" />
                <span>WAKE WORD: {config.wakeWordEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 tracking-wide font-sans hidden sm:block">
              Continuous Voice-to-Voice AI • WhatsApp, YouTube & Urdu/Hindi Integration
            </p>
          </div>
        </div>

        {/* Center Status Indicator */}
        <div className="flex items-center justify-center">
          <StatusIndicator
            state={state}
            latencyMs={stats.latencyMs}
            sessionDuration={stats.sessionDuration}
            mode={connectionMode}
            isSystemOnline={isSystemOnline}
            onToggleMode={handleToggleConnectionMode}
          />
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2">
          {/* Sound Synthesizer Mute Toggle */}
          <button
            onClick={() => {
              const next = !config.soundEffectsEnabled;
              soundEffects.enabled = next;
              updateConfig({ soundEffectsEnabled: next });
            }}
            title={config.soundEffectsEnabled ? 'Mute HUD Sound FX' : 'Enable HUD Sound FX'}
            className="p-2 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors backdrop-blur-md"
          >
            {config.soundEffectsEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Diagnostics & Reminders Drawer */}
          <button
            onClick={() => {
              soundEffects.playClickSound();
              setIsDiagnosticsOpen(true);
            }}
            title="System Diagnostics & Reminders"
            className="relative p-2 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors backdrop-blur-md"
          >
            <Layers className="w-4 h-4" />
            {reminders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className="p-2 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors backdrop-blur-md hidden sm:block"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={() => {
              soundEffects.playClickSound();
              setIsSettingsOpen(true);
            }}
            title="Settings & Capabilities"
            className="p-2 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors backdrop-blur-md"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN VIEWPORT: CENTER ORB & VOICE PIPELINE */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-2 my-auto w-full max-w-4xl mx-auto">
        {/* Absolute Left & Right Telemetry on Desktop */}
        <div className="absolute top-4 left-0 pointer-events-none">
          <HudTelemetry
            state={state}
            stats={stats}
            voiceName={config.voiceName}
            themeHue={config.themeHue}
          />
        </div>

        {/* The Center Interactive Microphone Orb */}
        <div className="relative flex flex-col items-center justify-center my-2">
          <OrbAnimation
            state={state}
            inputLevel={inputLevel}
            outputLevel={outputLevel}
            inputFrequencies={inputFrequencies}
            outputFrequencies={outputFrequencies}
            onClick={handleOrbClick}
            isMuted={isMuted}
            themeHue={config.themeHue}
          />
        </div>

        {/* Live Subtitle & Error Messages Overlay */}
        <div className="w-full flex justify-center mt-1 mb-2 min-h-[58px]">
          <SessionOverlay
            state={state}
            currentSubtitle={currentSubtitle}
            errorMessage={errorMessage}
            onDismissError={dismissError}
            permissionDenied={permissionDenied}
          />
        </div>

        {/* Audio Frequency Spectrum Equalizer Visualizer */}
        <div className="w-full flex justify-center mb-3">
          <VoiceVisualizer
            state={state}
            inputLevel={inputLevel}
            outputLevel={outputLevel}
            inputFrequencies={inputFrequencies}
            outputFrequencies={outputFrequencies}
            isMuted={isMuted}
            themeHue={config.themeHue}
          />
        </div>

        {/* Main Session Control Button */}
        <div className="flex justify-center mt-1 mb-3">
          <MicButton
            state={state}
            isMuted={isMuted}
            onToggleSession={() => {
              if (state === 'disconnected' || state === 'error') {
                startSession();
              } else {
                endSession();
              }
            }}
            onToggleMute={toggleMute}
            disabled={state === 'connecting' || state === 'reconnecting'}
          />
        </div>

        {/* 1-Tap Record, Live Typing & Send Box */}
        <div className="w-full flex justify-center mt-2">
          <VoiceRecorderBox
            onSend={sendTextMessage}
            disabled={state === 'connecting'}
            assistantName={config.assistantPersona === 'jarvis' ? 'Jarvis' : 'Noira / Myra'}
            isSpeaking={state === 'speaking'}
          />
        </div>
      </main>

      {/* FOOTER BAR */}
      <footer className="relative z-20 w-full px-6 py-3 flex items-center justify-between border-t border-white/5 backdrop-blur-sm text-[11px] font-mono text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-400">
            {connectionMode === 'offline' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> LOCAL NEURAL CORE
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> GEMINI 3.8 LIVE ENGINE
              </>
            )}
          </span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline text-slate-500">
            {connectionMode === 'offline' ? 'MODEL: ON-DEVICE LOCAL' : 'FREE TIER: GEMINI LIVE'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-400">
            {reminders.length > 0 ? `${reminders.length} Active Reminder(s)` : 'Boss AI Ready'}
          </span>
          <span className="hidden sm:inline">|</span>
          <span className="text-slate-500 hidden sm:inline">
            JARVIS / MYRA (مایرا)
          </span>
        </div>
      </footer>

      {/* Modals and Notifications */}
      <ToolCallNotification record={recentToolRecord} onDismiss={clearRecentTool} />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onUpdateConfig={updateConfig}
      />

      <DiagnosticsDrawer
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        reminders={reminders}
        onDeleteReminder={deleteReminder}
        deviceState={deviceState}
        transcripts={transcripts}
        stats={stats}
      />
    </div>
  );
}
