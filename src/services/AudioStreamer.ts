import { AudioStreamerConfig } from '../types/audio.types';
import { float32ToPcm16, pcm16ToBase64, calculateRMS, downsampleBuffer } from '../utils/audioUtils';

/**
 * Captures microphone audio at 16000 Hz, downsamples/converts to PCM16, and streams chunks.
 * Also provides high-frequency AnalyserNode data for real-time reactive HUD visuals.
 */
export class AudioStreamer {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private config: AudioStreamerConfig;
  private isStreaming: boolean = false;
  private isMuted: boolean = false;
  private isAiSpeaking: boolean = false;
  private animFrameId: number | null = null;

  constructor(config: AudioStreamerConfig) {
    this.config = config;
  }

  public setAiSpeaking(speaking: boolean) {
    this.isAiSpeaking = speaking;
  }

  public async start(deviceId?: string): Promise<void> {
    if (this.isStreaming) return;

    try {
      // Setup constraints
      const constraints: MediaStreamConstraints = {
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          deviceId: deviceId ? { exact: deviceId } : undefined,
        },
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      // Many browsers cap mic input context sampleRate or enforce hardware rate (e.g. 44.1k/48k).
      // We handle either direct 16k context or downsample safely.
      this.ctx = new AudioCtx();
      const currentRate = this.ctx.sampleRate;

      this.source = this.ctx.createMediaStreamSource(this.stream);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.7;

      // 2048 buffer size gives ~42ms latency at 48kHz, ~128ms at 16kHz for fast response
      const bufferSize = this.config.bufferSize || 2048;
      this.processor = this.ctx.createScriptProcessor(bufferSize, 1, 1);

      this.processor.onaudioprocess = (e: AudioProcessingEvent) => {
        // Prevent echo: ignore mic input if muted or if Myra is currently speaking aloud
        if (!this.isStreaming || this.isMuted || this.isAiSpeaking) return;

        const inputChannelData = e.inputBuffer.getChannelData(0);
        const rms = calculateRMS(inputChannelData);

        // Noise gate threshold: highly responsive so speech streams without initial lag
        const threshold = Math.max(0.001, (1 - this.config.audioSensitivity) * 0.02);

        if (rms < threshold) {
          return;
        }

        // Downsample to 16000 Hz if needed
        let targetFloat32: Float32Array = inputChannelData;
        if (currentRate !== 16000) {
          targetFloat32 = downsampleBuffer(inputChannelData, currentRate, 16000);
        }

        const pcm16 = float32ToPcm16(targetFloat32);
        const base64Chunk = pcm16ToBase64(pcm16);
        this.config.onAudioChunk(base64Chunk);
      };

      this.source.connect(this.analyser);
      this.analyser.connect(this.processor);
      this.processor.connect(this.ctx.destination);

      this.isStreaming = true;
      this.startAnalyserLoop();
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('Permission denied')) {
        console.warn('[AudioStreamer] Microphone permission restricted by browser.');
      } else {
        console.warn('[AudioStreamer] Microphone stream notice:', err?.message || err);
      }
      this.config.onError?.(err);
    }
  }

  private startAnalyserLoop() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    const freqArray = new Uint8Array(64);

    const loop = () => {
      if (this.analyser && this.isStreaming && !this.isMuted) {
        this.analyser.getByteFrequencyData(freqArray);
        let sum = 0;
        for (let i = 0; i < freqArray.length; i++) {
          sum += freqArray[i];
        }
        const avg = sum / freqArray.length / 255;
        this.config.onInputLevel(avg, freqArray);
      } else {
        this.config.onInputLevel(0, new Uint8Array(64));
      }
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public setSensitivity(sensitivity: number) {
    this.config.audioSensitivity = sensitivity;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsStreaming(): boolean {
    return this.isStreaming;
  }

  public stop(): void {
    this.isStreaming = false;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
      this.ctx = null;
    }
    this.config.onInputLevel(0, new Uint8Array(64));
  }
}
