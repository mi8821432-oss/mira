import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioStreamer } from '../services/AudioStreamer';

interface UseAudioInputProps {
  onAudioChunk: (chunk: string) => void;
  audioSensitivity: number;
  onError?: (err: Error) => void;
}

export function useAudioInput({ onAudioChunk, audioSensitivity, onError }: UseAudioInputProps) {
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [inputLevel, setInputLevel] = useState<number>(0);
  const [inputFrequencies, setInputFrequencies] = useState<Uint8Array>(new Uint8Array(64));
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);

  const streamerRef = useRef<AudioStreamer | null>(null);
  const onAudioChunkRef = useRef(onAudioChunk);
  onAudioChunkRef.current = onAudioChunk;

  const startInput = useCallback(async (deviceId?: string) => {
    try {
      if (!streamerRef.current) {
        streamerRef.current = new AudioStreamer({
          sampleRate: 16000,
          bufferSize: 1024,
          audioSensitivity,
          onAudioChunk: (chunk) => onAudioChunkRef.current(chunk),
          onInputLevel: (level, freqs) => {
            setInputLevel(level);
            setInputFrequencies(freqs);
          },
          onError: (err) => {
            if (
              err.name === 'NotAllowedError' ||
              err.name === 'PermissionDeniedError' ||
              err.message?.includes('Permission denied')
            ) {
              setPermissionDenied(true);
            }
            onError?.(err);
          },
        });
      }

      await streamerRef.current.start(deviceId);
      setIsCapturing(true);
      setPermissionDenied(false);
    } catch (err: any) {
      if (
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError' ||
        err.message?.includes('Permission denied')
      ) {
        setPermissionDenied(true);
      }
      setIsCapturing(false);
      onError?.(err);
    }
  }, [audioSensitivity, onError]);

  const stopInput = useCallback(() => {
    if (streamerRef.current) {
      streamerRef.current.stop();
      streamerRef.current = null;
    }
    setIsCapturing(false);
    setInputLevel(0);
    setInputFrequencies(new Uint8Array(64));
  }, []);

  const toggleMute = useCallback(() => {
    if (streamerRef.current) {
      const next = !isMuted;
      streamerRef.current.setMuted(next);
      setIsMuted(next);
      if (next) {
        setInputLevel(0);
      }
    }
  }, [isMuted]);

  useEffect(() => {
    if (streamerRef.current) {
      streamerRef.current.setSensitivity(audioSensitivity);
    }
  }, [audioSensitivity]);

  useEffect(() => {
    return () => {
      if (streamerRef.current) {
        streamerRef.current.stop();
      }
    };
  }, []);

  const setAiSpeaking = useCallback((speaking: boolean) => {
    if (streamerRef.current) {
      streamerRef.current.setAiSpeaking(speaking);
    }
  }, []);

  return {
    isCapturing,
    isMuted,
    inputLevel,
    inputFrequencies,
    permissionDenied,
    startInput,
    stopInput,
    toggleMute,
    setAiSpeaking,
  };
}
