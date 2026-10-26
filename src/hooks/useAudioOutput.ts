import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioPlayer } from '../services/AudioPlayer';
import { AudioPlaybackState } from '../types/audio.types';

export function useAudioOutput() {
  const [playbackState, setPlaybackState] = useState<AudioPlaybackState>('idle');
  const [outputLevel, setOutputLevel] = useState<number>(0);
  const [outputFrequencies, setOutputFrequencies] = useState<Uint8Array>(new Uint8Array(64));

  const playerRef = useRef<AudioPlayer | null>(null);

  const getPlayer = useCallback(() => {
    if (!playerRef.current) {
      playerRef.current = new AudioPlayer({
        sampleRate: 24000,
        onOutputLevel: (level, freqs) => {
          setOutputLevel(level);
          setOutputFrequencies(freqs);
        },
        onPlaybackStateChange: (state) => {
          setPlaybackState(state);
        },
      });
    }
    return playerRef.current;
  }, []);

  const playChunk = useCallback((base64Chunk: string) => {
    const player = getPlayer();
    player.enqueueBase64Chunk(base64Chunk);
  }, [getPlayer]);

  const interrupt = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.interrupt();
    }
    setOutputLevel(0);
    setOutputFrequencies(new Uint8Array(64));
    setPlaybackState('idle');
  }, []);

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  return {
    playbackState,
    outputLevel,
    outputFrequencies,
    playChunk,
    interrupt,
  };
}
