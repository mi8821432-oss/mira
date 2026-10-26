import { VoiceState, SessionConfig, LiveTranscriptItem, SessionStats } from '../types/session.types';
import { ToolCall } from '../types/tool.types';
import { toolExecutor } from './ToolExecutor';
import { soundEffects } from '../utils/streamUtils';

export interface GeminiLiveCallbacks {
  onStateChange: (state: VoiceState) => void;
  onAudioChunk: (base64Chunk: string) => void;
  onInterrupted: () => void;
  onTranscript: (item: LiveTranscriptItem) => void;
  onStatsUpdate: (stats: Partial<SessionStats>) => void;
  onError: (errorMsg: string) => void;
}

export class GeminiLiveService {
  private ws: WebSocket | null = null;
  private state: VoiceState = 'disconnected';
  private callbacks: GeminiLiveCallbacks;
  private config: SessionConfig;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private pingIntervalId: any = null;
  private statsTimerId: any = null;
  private lastPingSentTime: number = 0;
  private sessionStartTime: number = 0;
  private totalBytesSent: number = 0;
  private totalBytesReceived: number = 0;
  private packetsSent: number = 0;
  private packetsReceived: number = 0;
  private isExplicitlyClosed: boolean = false;

  constructor(config: SessionConfig, callbacks: GeminiLiveCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  public getState(): VoiceState {
    return this.state;
  }

  private setState(newState: VoiceState) {
    if (this.state === newState) return;
    this.state = newState;
    this.callbacks.onStateChange(newState);
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    this.setState(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/live`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.sessionStartTime = Date.now();
        soundEffects.playConnectSound();

        // Send initial handshake with configuration
        this.send({
          type: 'init',
          config: {
            voiceName: this.config.voiceName,
            systemInstruction: this.config.systemInstruction,
          },
        });

        this.setState('listening');
        this.startHeartbeat();
      };

      this.ws.onmessage = async (event: MessageEvent) => {
        try {
          const rawData = event.data;
          this.totalBytesReceived += typeof rawData === 'string' ? rawData.length : rawData.byteLength || 0;
          this.packetsReceived++;

          const msg = JSON.parse(rawData);

          switch (msg.type) {
            case 'pong': {
              const rtt = Date.now() - this.lastPingSentTime;
              this.callbacks.onStatsUpdate({ latencyMs: rtt });
              break;
            }

            case 'audio': {
              if (msg.data) {
                this.setState('speaking');
                this.callbacks.onAudioChunk(msg.data);
              }
              break;
            }

            case 'interrupted': {
              soundEffects.playInterruptSound();
              this.setState('interrupted');
              this.callbacks.onInterrupted();
              setTimeout(() => {
                if (this.state === 'interrupted') {
                  this.setState('listening');
                }
              }, 120);
              break;
            }

            case 'turn_complete': {
              // Model finished speaking turn
              this.setState('listening');
              break;
            }

            case 'thinking': {
              this.setState('thinking');
              break;
            }

            case 'transcript': {
              if (msg.text) {
                const item: LiveTranscriptItem = {
                  id: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  sender: (msg.sender === 'user' ? 'user' : 'myra') as any,
                  text: msg.text,
                  timestamp: Date.now(),
                  isFinal: !!msg.isFinal,
                  mode: 'online',
                };
                this.callbacks.onTranscript(item);
              }
              break;
            }

            case 'tool_call': {
              this.setState('thinking');
              const toolCall: ToolCall = {
                id: msg.id || `call_${Date.now()}`,
                name: msg.name,
                args: msg.args || {},
                timestamp: Date.now(),
              };

              // Execute tool on client
              const toolResult = await toolExecutor.executeTool(toolCall);

              // Return tool response back to Gemini session
              this.send({
                type: 'tool_response',
                id: toolCall.id,
                name: toolCall.name,
                response: toolResult,
              });
              break;
            }

            case 'error': {
              console.warn('[GeminiLiveService] Server error message:', msg.error);
              this.callbacks.onError(msg.error || 'Server error occurred');
              break;
            }

            default:
              break;
          }
        } catch (err) {
          console.error('[GeminiLiveService] Error handling message:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[GeminiLiveService] WebSocket error:', err);
      };

      this.ws.onclose = (event) => {
        this.stopHeartbeat();
        if (this.isExplicitlyClosed) {
          this.setState('disconnected');
          return;
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          this.setState('reconnecting');
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 5000);
          setTimeout(() => {
            if (!this.isExplicitlyClosed) {
              this.connect();
            }
          }, delay);
        } else {
          this.setState('error');
          this.callbacks.onError('Connection closed. Tap Orb to reconnect.');
        }
      };
    } catch (err: any) {
      this.setState('error');
      this.callbacks.onError(err.message || 'Failed to initialize connection');
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingIntervalId = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingSentTime = Date.now();
        this.send({ type: 'ping', time: this.lastPingSentTime });
      }
    }, 4000);

    this.statsTimerId = setInterval(() => {
      if (this.sessionStartTime > 0) {
        const duration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
        this.callbacks.onStatsUpdate({
          sessionDuration: duration,
          bytesSent: this.totalBytesSent,
          bytesReceived: this.totalBytesReceived,
          packetsSent: this.packetsSent,
          packetsReceived: this.packetsReceived,
        });
      }
    }, 1000);
  }

  private stopHeartbeat() {
    if (this.pingIntervalId) clearInterval(this.pingIntervalId);
    if (this.statsTimerId) clearInterval(this.statsTimerId);
    this.pingIntervalId = null;
    this.statsTimerId = null;
  }

  public sendAudioChunk(base64Chunk: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.send({
      type: 'audio',
      data: base64Chunk,
    });
  }

  public sendTextMessage(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.send({
      type: 'text',
      text,
    });
  }

  public updateVoice(voiceName: SessionConfig['voiceName']) {
    this.config.voiceName = voiceName;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'update_config',
        config: { voiceName },
      });
    }
  }

  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const payload = JSON.stringify(data);
      this.ws.send(payload);
      this.totalBytesSent += payload.length;
      this.packetsSent++;
    }
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // ignore
      }
      this.ws = null;
    }
    this.setState('disconnected');
  }
}
