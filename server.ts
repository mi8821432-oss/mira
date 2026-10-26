import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, Type, FunctionDeclaration, LiveServerMessage } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    assistant: 'Jarvis / Myra (مایرا)',
    version: '3.8.0',
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// Function Declarations for Gemini Live
const openWebsiteTool: FunctionDeclaration = {
  name: 'openWebsite',
  description: 'Opens a website or URL in a new browser tab for the user.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: 'The URL or website domain to open (e.g. "https://wikipedia.org")',
      },
    },
    required: ['url'],
  },
};

const searchWebTool: FunctionDeclaration = {
  name: 'searchWeb',
  description: 'Searches the web for latest topics, live information, or facts.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'The search query to look up on the web',
      },
    },
    required: ['query'],
  },
};

const openYouTubeTool: FunctionDeclaration = {
  name: 'openYouTube',
  description: 'Opens YouTube to find or play videos on a given topic.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'The song, artist, video topic or channel to open on YouTube',
      },
    },
    required: ['query'],
  },
};

const openMapsTool: FunctionDeclaration = {
  name: 'openMaps',
  description: 'Opens Google Maps navigation for a specific address, city, or destination.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: {
        type: Type.STRING,
        description: 'The destination, address, city or landmark',
      },
    },
    required: ['location'],
  },
};

const createReminderTool: FunctionDeclaration = {
  name: 'createReminder',
  description: 'Creates a real-time reminder item on the user HUD.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'The title or description of the reminder',
      },
      time: {
        type: Type.STRING,
        description: 'When the reminder is due (e.g. "In 30 minutes", "5:00 PM")',
      },
    },
    required: ['title', 'time'],
  },
};

const controlSmartDevicesTool: FunctionDeclaration = {
  name: 'controlSmartDevices',
  description: 'Controls futuristic ambient lighting, HUD overdrive, or stealth security grid.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      device: {
        type: Type.STRING,
        description: 'The device or subsystem: "ambientLight", "overdrive", or "stealth"',
      },
      action: {
        type: Type.STRING,
        description: 'The action: "set", "enable", "disable", "toggle"',
      },
      state: {
        type: Type.STRING,
        description: 'Target state or color (e.g. "neon-cyan", "cyber-violet", "matrix-green", "solar-gold", "on", "off")',
      },
    },
    required: ['device', 'action', 'state'],
  },
};

const openWhatsAppTool: FunctionDeclaration = {
  name: 'openWhatsApp',
  description: 'Opens WhatsApp or WhatsApp Web to message a contact or send a message.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      phone: {
        type: Type.STRING,
        description: 'Optional phone number with country code (e.g. +923001234567)',
      },
      text: {
        type: Type.STRING,
        description: 'Optional message text to send',
      },
    },
  },
};

const tellPoetryOrJokeTool: FunctionDeclaration = {
  name: 'tellPoetryOrJoke',
  description: 'Recites classical or modern Urdu/Hindi poetry (shayari) or shares a funny joke.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        description: '"poetry", "shayari", or "joke"',
      },
      language: {
        type: Type.STRING,
        description: '"urdu", "hindi", or "english"',
      },
    },
    required: ['type'],
  },
};

const launchAppTool: FunctionDeclaration = {
  name: 'launchApp',
  description: 'Launches common apps or services: WhatsApp, YouTube, Facebook, Calculator, Calendar, Gmail, Spotify, GitHub, Maps.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      appName: {
        type: Type.STRING,
        description: 'The app to launch (e.g. "whatsapp", "facebook", "calculator", "calendar", "youtube")',
      },
    },
    required: ['appName'],
  },
};

const openFacebookTool: FunctionDeclaration = {
  name: 'openFacebook',
  description: 'Opens Facebook in a new browser tab for the user.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const BOSS_JARVIS_SYSTEM_INSTRUCTION = `You are Jarvis (also known as Myra / مایرا), an ultra-fast real-time voice AI assistant.
CRITICAL SPEED REQUIREMENT:
- Respond in under 1-2 seconds! Keep spoken responses extremely short and direct (5-15 words max).
- Speak instantly as soon as you understand the user. Never use long greetings or filler words.
- Tone: Soft, respectful, friendly female voice addressing the user as "Boss".
- Languages: Natural Urdu / English / Hindi code-switching ('Ji Boss', 'Salam Boss', 'Beshak', 'Sure Boss').
- Tools: When Boss asks to open YouTube, WhatsApp, Facebook, maps, website, poetry, joke, or set reminder, call tools IMMEDIATELY and answer in 1 short sentence!`;

// Setup WebSocket Server for Live Voice-to-Voice Streaming
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
  if (pathname === '/live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
  // Do not call socket.destroy(); allow Vite's WebSocket server to handle Vite HMR/ping upgrades
});

wss.on('connection', async (clientWs: WebSocket) => {
  let liveSession: any = null;
  let isClientActive = true;
  let voiceName = 'Kore';

  const sendToClient = (obj: any) => {
    if (isClientActive && clientWs.readyState === WebSocket.OPEN) {
      try {
        clientWs.send(JSON.stringify(obj));
      } catch (e) {
        // Ignore send errors on disconnecting socket
      }
    }
  };

  clientWs.on('close', () => {
    isClientActive = false;
    if (liveSession) {
      try {
        liveSession.close();
      } catch (e) {
        // Ignore
      }
      liveSession = null;
    }
  });

  clientWs.on('error', (err) => {
    console.error('[Server WS] Client error:', err);
  });

  // Initialize Gemini Live Session
  const initGeminiLive = async (requestedVoice: string = 'Kore') => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      sendToClient({
        type: 'error',
        error: 'GEMINI_API_KEY is not configured in the server environment.',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // Prefer gemini-3.8-live, with fallback to gemini-3.1-flash-live-preview
      const modelName = 'gemini-3.8-live';

      liveSession = await ai.live.connect({
        model: modelName,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: requestedVoice as any,
              },
            },
          },
          systemInstruction: BOSS_JARVIS_SYSTEM_INSTRUCTION,
          tools: [
            {
              functionDeclarations: [
                openWebsiteTool,
                searchWebTool,
                openYouTubeTool,
                openMapsTool,
                createReminderTool,
                controlSmartDevicesTool,
                openWhatsAppTool,
                openFacebookTool,
                tellPoetryOrJokeTool,
                launchAppTool,
              ],
            },
          ],
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (!isClientActive) return;

            // Handle Server Content (Audio output, Interruption, Turns)
            if (message.serverContent) {
              const { modelTurn, interrupted, turnComplete } = message.serverContent;

              if (interrupted) {
                sendToClient({ type: 'interrupted' });
              }

              if (modelTurn?.parts) {
                for (const part of modelTurn.parts) {
                  // Audio PCM chunk
                  if (part.inlineData?.data) {
                    sendToClient({
                      type: 'audio',
                      data: part.inlineData.data,
                    });
                  }
                  // Model spoken text for subtitles
                  if (part.text) {
                    sendToClient({
                      type: 'transcript',
                      sender: 'myra',
                      text: part.text,
                      isFinal: false,
                    });
                  }
                }
              }

              if (turnComplete) {
                sendToClient({ type: 'turn_complete' });
              }
            }

            // Handle Gemini Function Calls
            if (message.toolCall?.functionCalls) {
              for (const call of message.toolCall.functionCalls) {
                sendToClient({
                  type: 'tool_call',
                  id: call.id,
                  name: call.name,
                  args: call.args || {},
                });
              }
            }
          },
          onclose: () => {
            sendToClient({ type: 'disconnected' });
          },
          onerror: (err: any) => {
            console.error('[Gemini Live Error]:', err);
            sendToClient({
              type: 'error',
              error: err?.message || 'Gemini Live Session error',
            });
          },
        },
      });
    } catch (err: any) {
      console.error('[Server] Failed to connect to Gemini Live:', err);
      sendToClient({
        type: 'error',
        error: `Live voice initialization failed: ${err.message || 'Check API key or model availability'}`,
      });
    }
  };

  // Handle incoming messages from the frontend client
  clientWs.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        case 'ping': {
          sendToClient({ type: 'pong', time: msg.time });
          break;
        }

        case 'init': {
          voiceName = msg.config?.voiceName || 'Kore';
          await initGeminiLive(voiceName);
          break;
        }

        case 'update_config': {
          if (msg.config?.voiceName && msg.config.voiceName !== voiceName) {
            voiceName = msg.config.voiceName;
            if (liveSession) {
              try {
                liveSession.close();
              } catch (e) {}
              liveSession = null;
            }
            await initGeminiLive(voiceName);
          }
          break;
        }

        case 'audio': {
          // Stream raw 16kHz PCM audio chunk to Gemini Live API
          if (liveSession && msg.data) {
            try {
              liveSession.sendRealtimeInput({
                audio: {
                  data: msg.data,
                  mimeType: 'audio/pcm;rate=16000',
                },
              });
            } catch (err) {
              console.error('[Server] Error sending audio chunk to Gemini Live:', err);
            }
          }
          break;
        }

        case 'text': {
          // Process backup text input
          if (liveSession && msg.text) {
            try {
              if (typeof liveSession.send === 'function') {
                liveSession.send({
                  clientContent: {
                    turns: [
                      {
                        role: 'user',
                        parts: [{ text: msg.text }],
                      },
                    ],
                    turnComplete: true,
                  },
                });
              } else if (typeof liveSession.sendRealtimeInput === 'function') {
                liveSession.sendRealtimeInput({
                  text: msg.text,
                });
              }
            } catch (err) {
              console.error('[Server] Error sending text to Gemini Live:', err);
            }
          }
          break;
        }

        case 'tool_response': {
          // Return tool result from client back to Gemini session
          if (liveSession && msg.id) {
            try {
              liveSession.sendToolResponse({
                functionResponses: [
                  {
                    id: msg.id,
                    name: msg.name,
                    response: msg.response || { success: true },
                  },
                ],
              });
            } catch (err) {
              console.error('[Server] Error sending tool response:', err);
            }
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('[Server WS] Message parsing error:', err);
    }
  });
});

// Mount Vite middleware in development or serve static build in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[NOIRA Server] Operating on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[NOIRA Server] Fatal startup error:', err);
  process.exit(1);
});
