import { AudioOutputConfig } from '../types/audio.types';
import { base64ToPcm16, pcm16ToAudioBuffer } from '../utils/audioUtils';

/**
 * High-performance 24kHz gapless Audio Output Player for Gemini Live API audio chunks.
 * Features jitter buffer synchronization, AnalyserNode audio reactive levels, and instant interruption.
 */
export class AudioPlayer {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private nextStartTime: number = 0;
  private activeSourceNodes: AudioBufferSourceNode[] = [];
  private config: AudioOutputConfig;
  private isPlaying: boolean = false;
  private sampleRate: number;
  private animFrameId: number | null = null;

  constructor(config?: Partial<AudioOutputConfig>) {
    this.sampleRate = config?.sampleRate || 24000;
    this.config = {
      sampleRate: this.sampleRate,
      onOutputLevel: config?.onOutputLevel || (() => {}),
      onPlaybackStateChange: config?.onPlaybackStateChange,
    };
  }

  private initContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ sampleRate: this.sampleRate });
      this.masterGain = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.startLevelMonitor();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private startLevelMonitor() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    const freqArray = new Uint8Array(64);

    const check = () => {
      if (this.analyser && this.isPlaying) {
        this.analyser.getByteFrequencyData(freqArray);
        let sum = 0;
        for (let i = 0; i < freqArray.length; i++) {
          sum += freqArray[i];
        }
        const avg = sum / freqArray.length / 255;
        this.config.onOutputLevel(avg, freqArray);
      } else {
        this.config.onOutputLevel(0, new Uint8Array(64));
      }
      this.animFrameId = requestAnimationFrame(check);
    };
    this.animFrameId = requestAnimationFrame(check);
  }

  /**
   * Queue and seamlessly schedule a base64 PCM16 audio chunk from Gemini Live
   */
  public enqueueBase64Chunk(base64Chunk: string) {
    try {
      const ctx = this.initContext();
      const pcm16 = base64ToPcm16(base64Chunk);
      if (pcm16.length === 0) return;

      const audioBuffer = pcm16ToAudioBuffer(pcm16, ctx, this.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      // Create a small gain node for micro fade-in/fade-out to eliminate edge clicking
      const chunkGain = ctx.createGain();
      source.connect(chunkGain);
      chunkGain.connect(this.masterGain!);

      const now = ctx.currentTime;
      // Schedule gapless
      if (this.nextStartTime < now) {
        this.nextStartTime = now + 0.002; // 2ms instant playback
      }

      const scheduledStart = this.nextStartTime;
      const scheduledEnd = scheduledStart + audioBuffer.duration;
      this.nextStartTime = scheduledEnd;

      // Envelope to soften clicks
      chunkGain.gain.setValueAtTime(0.0, scheduledStart);
      chunkGain.gain.linearRampToValueAtTime(1.0, scheduledStart + 0.005);
      chunkGain.gain.setValueAtTime(1.0, Math.max(scheduledStart + 0.005, scheduledEnd - 0.005));
      chunkGain.gain.linearRampToValueAtTime(0.0, scheduledEnd);

      source.start(scheduledStart);
      this.activeSourceNodes.push(source);
      this.isPlaying = true;
      this.config.onPlaybackStateChange?.('playing');

      source.onended = () => {
        const index = this.activeSourceNodes.indexOf(source);
        if (index > -1) {
          this.activeSourceNodes.splice(index, 1);
        }
        if (this.activeSourceNodes.length === 0 && ctx.currentTime >= this.nextStartTime - 0.05) {
          this.isPlaying = false;
          this.config.onPlaybackStateChange?.('idle');
        }
      };
    } catch (err) {
      console.error('[AudioPlayer] Error processing audio chunk:', err);
    }
  }

  /**
   * Immediately stops all playing audio and empties the schedule (e.g. user interruption)
   */
  public interrupt() {
    this.config.onPlaybackStateChange?.('interrupted');
    if (this.masterGain && this.ctx) {
      try {
        // Instant micro fade-out (15ms)
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0, now + 0.015);
      } catch (e) {
        // Ignore
      }
    }

    setTimeout(() => {
      this.activeSourceNodes.forEach((node) => {
        try {
          node.stop();
          node.disconnect();
        } catch (e) {
          // Node may already be stopped
        }
      });
      this.activeSourceNodes = [];
      this.nextStartTime = 0;
      this.isPlaying = false;

      if (this.masterGain && this.ctx) {
        try {
          this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        } catch (e) {
          // Ignore
        }
      }
      this.config.onPlaybackStateChange?.('idle');
    }, 20);
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public destroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.interrupt();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
  }
}
