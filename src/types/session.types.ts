export type VoiceState =
  | 'disconnected'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'reconnecting'
  | 'error';

export type ConnectionMode = 'online' | 'offline';

export interface SessionConfig {
  voiceName: 'Aoede' | 'Kore' | 'Zephyr' | 'Puck' | 'Fenrir' | 'Charon';
  audioSensitivity: number; // 0 to 1
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  systemInstruction?: string;
  selectedMicId?: string;
  soundEffectsEnabled: boolean;
  themeHue: 'violet' | 'cyan' | 'matrix' | 'amber';
  connectionMode: ConnectionMode;
  wakeWordEnabled: boolean;
  assistantPersona: 'jarvis' | 'myra';
  preferredLanguage: 'urdu-english' | 'english' | 'hindi';
}

export interface LiveTranscriptItem {
  id: string;
  sender: 'user' | 'myra' | 'jarvis' | 'noira';
  text: string;
  timestamp: number;
  isFinal: boolean;
  mode?: ConnectionMode;
}

export interface SessionStats {
  latencyMs: number;
  bytesSent: number;
  bytesReceived: number;
  sessionDuration: number;
  packetsSent: number;
  packetsReceived: number;
  sampleRateIn: number;
  sampleRateOut: number;
  fps: number;
  isOnline: boolean;
  mode: ConnectionMode;
  wakeWordArmed: boolean;
}
