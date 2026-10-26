export interface AudioLevelData {
  inputLevel: number; // 0 to 1
  outputLevel: number; // 0 to 1
  inputFrequencies: Uint8Array;
  outputFrequencies: Uint8Array;
}

export type AudioPlaybackState = 'idle' | 'playing' | 'interrupted' | 'buffered';

export interface AudioStreamerConfig {
  sampleRate: number;
  bufferSize: number;
  audioSensitivity: number;
  onAudioChunk: (base64Chunk: string) => void;
  onInputLevel: (level: number, frequencies: Uint8Array) => void;
  onError?: (error: Error) => void;
}

export interface AudioOutputConfig {
  sampleRate: number;
  onOutputLevel: (level: number, frequencies: Uint8Array) => void;
  onPlaybackStateChange?: (state: AudioPlaybackState) => void;
}
