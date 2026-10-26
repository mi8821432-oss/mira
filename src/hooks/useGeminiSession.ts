import { useState, useRef, useCallback, useEffect } from 'react';
import { SessionConfig, LiveTranscriptItem, SessionStats, VoiceState, ConnectionMode } from '../types/session.types';
import { GeminiLiveService } from '../services/GeminiLiveService';
import { OfflineVoiceEngine } from '../services/OfflineVoiceEngine';
import { useVoiceState } from './useVoiceState';
import { useAudioInput } from './useAudioInput';
import { useAudioOutput } from './useAudioOutput';
import { toolExecutor } from '../services/ToolExecutor';
import { ReminderItem, SmartDeviceState, ToolExecutionRecord } from '../types/tool.types';
import { soundEffects } from '../utils/streamUtils';

const DEFAULT_CONFIG: SessionConfig = {
  voiceName: 'Kore',
  audioSensitivity: 0.75,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  soundEffectsEnabled: true,
  themeHue: 'violet',
  connectionMode: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online',
  wakeWordEnabled: true,
  assistantPersona: 'jarvis',
  preferredLanguage: 'urdu-english',
};

export function useGeminiSession() {
  const [config, setConfig] = useState<SessionConfig>(DEFAULT_CONFIG);
  const [transcripts, setTranscripts] = useState<LiveTranscriptItem[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [isSystemOnline, setIsSystemOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [offlineOutputLevel, setOfflineOutputLevel] = useState<number>(0);
  const [offlineFrequencies, setOfflineFrequencies] = useState<Uint8Array>(new Uint8Array(64));

  const [stats, setStats] = useState<SessionStats>({
    latencyMs: 24,
    bytesSent: 0,
    bytesReceived: 0,
    sessionDuration: 0,
    packetsSent: 0,
    packetsReceived: 0,
    sampleRateIn: 16000,
    sampleRateOut: 24000,
    fps: 60,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    mode: config.connectionMode,
    wakeWordArmed: config.wakeWordEnabled,
  });

  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [deviceState, setDeviceState] = useState<SmartDeviceState>(toolExecutor.getSmartDeviceState());
  const [recentToolRecord, setRecentToolRecord] = useState<ToolExecutionRecord | null>(null);

  const { state, transitionTo, errorMessage, clearError } = useVoiceState('disconnected');
  const serviceRef = useRef<GeminiLiveService | null>(null);
  const offlineEngineRef = useRef<OfflineVoiceEngine | null>(null);

  // Audio output hook for 24kHz online playback
  const {
    outputLevel: onlineOutputLevel,
    outputFrequencies: onlineOutputFrequencies,
    playChunk,
    interrupt: interruptAudioOutput,
  } = useAudioOutput();

  // Combine levels for visualizer based on mode
  const outputLevel = config.connectionMode === 'offline' ? offlineOutputLevel : onlineOutputLevel;
  const outputFrequencies =
    config.connectionMode === 'offline' ? offlineFrequencies : onlineOutputFrequencies;

  // Handle outgoing audio chunks to WebSocket in online mode
  const handleAudioChunk = useCallback((base64Chunk: string) => {
    if (serviceRef.current && config.connectionMode === 'online') {
      serviceRef.current.sendAudioChunk(base64Chunk);
    }
  }, [config.connectionMode]);

  // Audio input hook
  const {
    isCapturing,
    isMuted,
    inputLevel,
    inputFrequencies,
    permissionDenied,
    startInput,
    stopInput,
    toggleMute,
    setAiSpeaking,
  } = useAudioInput({
    onAudioChunk: handleAudioChunk,
    audioSensitivity: config.audioSensitivity,
    onError: (err) => {
      transitionTo('error', err.message || 'Microphone error');
    },
  });

  // Echo prevention: mute mic input stream while Myra is speaking
  useEffect(() => {
    setAiSpeaking(state === 'speaking');
  }, [state, setAiSpeaking]);

  // Network status listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsSystemOnline(true);
      setStats((prev) => ({ ...prev, isOnline: true }));
    };
    const handleOffline = () => {
      setIsSystemOnline(false);
      setStats((prev) => ({ ...prev, isOnline: false }));
      // Auto-switch to offline mode if connection drops during active conversation
      setConfig((prev) => {
        if (prev.connectionMode === 'online') {
          return { ...prev, connectionMode: 'offline' };
        }
        return prev;
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to tool events
  useEffect(() => {
    const unsubTool = toolExecutor.onToolExecuted((rec) => {
      setRecentToolRecord(rec);
      setTimeout(() => {
        setRecentToolRecord((current) => (current?.id === rec.id ? null : current));
      }, 6000);
    });

    const unsubReminders = toolExecutor.onRemindersUpdated((list) => {
      setReminders(list);
    });

    const unsubDevice = toolExecutor.onDeviceStateUpdated((dev) => {
      setDeviceState(dev);
    });

    return () => {
      unsubTool();
      unsubReminders();
      unsubDevice();
    };
  }, []);

  // Initialize Offline Voice Engine
  const getOfflineEngine = useCallback(() => {
    if (!offlineEngineRef.current) {
      offlineEngineRef.current = new OfflineVoiceEngine({
        onListening: () => {
          transitionTo('listening');
        },
        onThinking: () => {
          transitionTo('thinking');
        },
        onSpeakingStart: (spokenText) => {
          transitionTo('speaking');
          setCurrentSubtitle(spokenText);
        },
        onSpeakingEnd: () => {
          transitionTo('listening');
        },
        onInterrupted: () => {
          transitionTo('interrupted');
        },
        onTranscript: (sender, text, isFinal) => {
          const item: LiveTranscriptItem = {
            id: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            sender: sender === 'user' ? 'user' : (config.assistantPersona === 'jarvis' ? 'jarvis' : 'myra'),
            text,
            timestamp: Date.now(),
            isFinal,
            mode: 'offline',
          };
          setTranscripts((prev) => [item, ...prev].slice(0, 30));
          if (sender !== 'user') {
            setCurrentSubtitle(text);
          }
        },
        onWakeWordDetected: (wakeWord) => {
          setCurrentSubtitle(`[Wake Word: "${wakeWord}"]`);
        },
        onOutputLevel: (level, freqs) => {
          setOfflineOutputLevel(level);
          setOfflineFrequencies(freqs);
        },
        onError: (err) => {
          transitionTo('error', err);
        },
      });
    }

    offlineEngineRef.current.setWakeWordEnabled(config.wakeWordEnabled);
    offlineEngineRef.current.setPersona(config.assistantPersona);
    offlineEngineRef.current.setLanguage(config.preferredLanguage);

    return offlineEngineRef.current;
  }, [config.assistantPersona, config.preferredLanguage, config.wakeWordEnabled, transitionTo]);

  // Start Session (Online or Offline)
  const startSession = useCallback(async (forcedMode?: ConnectionMode) => {
    clearError();
    transitionTo('connecting');

    const effectiveMode = forcedMode || config.connectionMode;
    soundEffects.playConnectSound();

    if (effectiveMode === 'offline' || !isSystemOnline) {
      // OFFLINE MODE: Use local speech recognition & synthesis
      try {
        const engine = getOfflineEngine();
        await engine.start();
        setStats((prev) => ({ ...prev, mode: 'offline', latencyMs: 12 }));
      } catch (err: any) {
        transitionTo('error', err.message || 'Offline speech engine failed');
      }
    } else {
      // ONLINE MODE: Connect to Gemini Live WebSocket API
      try {
        await startInput(config.selectedMicId);

        const service = new GeminiLiveService(config, {
          onStateChange: (newState) => {
            transitionTo(newState);
          },
          onAudioChunk: (chunk) => {
            playChunk(chunk);
          },
          onInterrupted: () => {
            interruptAudioOutput();
            transitionTo('interrupted');
          },
          onTranscript: (item) => {
            setTranscripts((prev) => [item, ...prev].slice(0, 30));
            if (item.sender === 'myra' || item.sender === 'noira') {
              setCurrentSubtitle(item.text);
            }
          },
          onStatsUpdate: (newStats) => {
            setStats((prev) => ({ ...prev, ...newStats, mode: 'online' }));
          },
          onError: (err) => {
            console.warn('[Gemini Live Error, auto-fallback available]:', err);
            transitionTo('error', `${err} (Switch to Offline Mode for local voice)`);
          },
        });

        serviceRef.current = service;
        service.connect();
      } catch (err: any) {
        stopInput();
        transitionTo('error', err.message || 'Failed to start online session');
      }
    }
  }, [clearError, config, getOfflineEngine, interruptAudioOutput, isSystemOnline, playChunk, startInput, stopInput, transitionTo]);

  const endSession = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.disconnect();
      serviceRef.current = null;
    }
    if (offlineEngineRef.current) {
      offlineEngineRef.current.stop();
    }
    stopInput();
    interruptAudioOutput();
    transitionTo('disconnected');
    setCurrentSubtitle('');
    setOfflineOutputLevel(0);
    setOfflineFrequencies(new Uint8Array(64));
  }, [interruptAudioOutput, stopInput, transitionTo]);

  // Mode switch (Online <-> Offline)
  const setConnectionMode = useCallback(
    (mode: ConnectionMode) => {
      const wasActive = state !== 'disconnected' && state !== 'error';
      endSession();
      setConfig((prev) => ({ ...prev, connectionMode: mode }));
      setStats((prev) => ({ ...prev, mode }));
      if (wasActive) {
        setTimeout(() => {
          startSession(mode);
        }, 150);
      }
    },
    [endSession, startSession, state]
  );

  // Send Text Input as Backup
  const sendTextMessage = useCallback(
    async (text: string) => {
      if (!text || text.trim().length === 0) return;
      const cleanText = text.trim();

      // Add to transcripts immediately
      const userItem: LiveTranscriptItem = {
        id: `tr_${Date.now()}_u`,
        sender: 'user',
        text: cleanText,
        timestamp: Date.now(),
        isFinal: true,
        mode: config.connectionMode,
      };
      setTranscripts((prev) => [userItem, ...prev].slice(0, 30));

      if (config.connectionMode === 'offline' || !isSystemOnline || !serviceRef.current) {
        // Instant direct local processing and speech output (<100ms)
        const engine = getOfflineEngine();
        await engine.processUserQuery(cleanText);
      } else {
        // Online Gemini Live mode: send to Live session and set rapid safety fallback
        try {
          serviceRef.current.sendTextMessage(cleanText);

          // 1.5s fallback safety: if online audio doesn't stream, local engine responds!
          const safetyTimer = setTimeout(() => {
            if (state !== 'speaking') {
              const engine = getOfflineEngine();
              engine.processUserQuery(cleanText);
            }
          }, 1500);

          return () => clearTimeout(safetyTimer);
        } catch (err) {
          const engine = getOfflineEngine();
          await engine.processUserQuery(cleanText);
        }
      }
    },
    [config.connectionMode, getOfflineEngine, isSystemOnline, state]
  );

  const updateVoice = useCallback((voiceName: SessionConfig['voiceName']) => {
    setConfig((prev) => ({ ...prev, voiceName }));
    if (serviceRef.current) {
      serviceRef.current.updateVoice(voiceName);
    }
  }, []);

  const updateSensitivity = useCallback((sensitivity: number) => {
    setConfig((prev) => ({ ...prev, audioSensitivity: sensitivity }));
  }, []);

  const updateConfig = useCallback((partial: Partial<SessionConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (serviceRef.current) {
        serviceRef.current.disconnect();
      }
      if (offlineEngineRef.current) {
        offlineEngineRef.current.stop();
      }
      stopInput();
      interruptAudioOutput();
    };
  }, [interruptAudioOutput, stopInput]);

  return {
    state,
    config,
    stats,
    transcripts,
    currentSubtitle,
    reminders,
    deviceState,
    recentToolRecord,
    isCapturing,
    isMuted,
    permissionDenied,
    inputLevel,
    inputFrequencies,
    outputLevel,
    outputFrequencies,
    errorMessage,
    isSystemOnline,
    connectionMode: config.connectionMode,
    startSession,
    endSession,
    toggleMute,
    updateVoice,
    updateSensitivity,
    updateConfig,
    setConnectionMode,
    sendTextMessage,
    toggleWakeWord: () =>
      setConfig((prev) => ({ ...prev, wakeWordEnabled: !prev.wakeWordEnabled })),
    togglePersona: () =>
      setConfig((prev) => ({
        ...prev,
        assistantPersona: prev.assistantPersona === 'jarvis' ? 'myra' : 'jarvis',
      })),
    deleteReminder: (id: string) => toolExecutor.deleteReminder(id),
    clearRecentTool: () => setRecentToolRecord(null),
    dismissError: clearError,
  };
}
