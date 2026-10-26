import { toolExecutor } from './ToolExecutor';
import { soundEffects } from '../utils/streamUtils';

export interface OfflineVoiceCallbacks {
  onListening: () => void;
  onThinking: () => void;
  onSpeakingStart: (text: string) => void;
  onSpeakingEnd: () => void;
  onInterrupted: () => void;
  onTranscript: (sender: 'user' | 'myra' | 'jarvis', text: string, isFinal: boolean) => void;
  onOutputLevel: (level: number, frequencies: Uint8Array) => void;
  onWakeWordDetected?: (wakeWord: string) => void;
  onError: (errMsg: string) => void;
}

export class OfflineVoiceEngine {
  private recognition: any = null;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private callbacks: OfflineVoiceCallbacks;
  private animFrameId: number | null = null;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private isExplicitlyStopped: boolean = false;
  private lastSpokenText: string = '';
  public wakeWordEnabled: boolean = false;
  public assistantPersona: 'jarvis' | 'myra' = 'jarvis';
  public preferredLanguage: 'urdu-english' | 'english' | 'hindi' = 'urdu-english';

  constructor(callbacks: OfflineVoiceCallbacks) {
    this.callbacks = callbacks;
    this.initSpeechSynthesis();
  }

  public setWakeWordEnabled(enabled: boolean) {
    this.wakeWordEnabled = enabled;
  }

  public setPersona(persona: 'jarvis' | 'myra') {
    this.assistantPersona = persona;
  }

  public setLanguage(lang: 'urdu-english' | 'english' | 'hindi') {
    this.preferredLanguage = lang;
    this.initSpeechSynthesis();
  }

  private initSpeechSynthesis() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      // Soft, friendly female voice search priority (Urdu / Hindi / Natural English)
      let selected: SpeechSynthesisVoice | undefined;

      if (this.preferredLanguage === 'hindi') {
        selected = voices.find((v) => v.lang.startsWith('hi'));
      } else if (this.preferredLanguage === 'urdu-english') {
        selected = voices.find((v) => v.lang.startsWith('ur') || v.lang.startsWith('hi'));
      }

      if (!selected) {
        const softFemaleKeywords = [
          'natural',
          'soft',
          'female',
          'samantha',
          'zira',
          'karen',
          'victoria',
          'google uk english female',
          'google us english female',
          'siri',
        ];
        selected = voices.find(
          (v) =>
            softFemaleKeywords.some((k) => v.name.toLowerCase().includes(k)) &&
            v.lang.startsWith('en')
        );
      }

      if (!selected) {
        selected = voices.find((v) => v.lang.startsWith('en')) || voices[0];
      }

      this.preferredVoice = selected || null;
    };

    pickVoice();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = pickVoice;
    }
  }

  private speechSilenceTimer: any = null;
  private pendingUtterance: string = '';

  public async start(): Promise<void> {
    this.isExplicitlyStopped = false;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      throw new Error(
        'Speech Recognition is not natively supported in this browser. Please use Chrome, Edge, or the text backup input.'
      );
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang =
        this.preferredLanguage === 'hindi' ? 'hi-IN' : 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.callbacks.onListening();
      };

      this.recognition.onresult = (event: any) => {
        // Prevent mic echo: ignore input while AI is speaking
        if (this.isSpeaking) return;

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const currentText = (finalTranscript.trim() || interimTranscript.trim()).trim();
        if (currentText) {
          this.pendingUtterance = currentText;
          this.callbacks.onTranscript('user', currentText, !!finalTranscript);

          if (this.speechSilenceTimer) {
            clearTimeout(this.speechSilenceTimer);
          }

          if (finalTranscript.trim()) {
            const textToProcess = finalTranscript.trim();
            this.pendingUtterance = '';
            this.handleVoiceUtterance(textToProcess);
          } else {
            // Trigger instant response 380ms after user stops speaking!
            this.speechSilenceTimer = setTimeout(() => {
              if (this.pendingUtterance && !this.isSpeaking) {
                const textToProcess = this.pendingUtterance;
                this.pendingUtterance = '';
                this.callbacks.onTranscript('user', textToProcess, true);
                this.handleVoiceUtterance(textToProcess);
              }
            }, 380);
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }
        console.warn('[OfflineVoiceEngine] Speech recognition notice:', event.error);
        if (event.error === 'not-allowed') {
          this.callbacks.onError('Microphone access denied. Please allow microphone permissions.');
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (!this.isExplicitlyStopped) {
          try {
            this.recognition.start();
          } catch (e) {
            // Already active
          }
        }
      };

      this.recognition.start();
    } catch (err: any) {
      console.error('[OfflineVoiceEngine] Error starting speech recognition:', err);
      this.callbacks.onError(err.message || 'Offline speech recognition failed to start');
      throw err;
    }
  }

  /**
   * Filter and verify wake word if wake-word mode is active
   */
  private handleVoiceUtterance(text: string) {
    const rawLower = text.toLowerCase().trim();

    if (this.wakeWordEnabled) {
      // Check for wake words: Jarvis, Myra, Boss
      const wakeWords = [
        'hello jarvis',
        'hey jarvis',
        'jarvis',
        'hello myra',
        'hey myra',
        'myra',
        'boss',
        'salam',
      ];

      const detected = wakeWords.find((w) => rawLower.includes(w));
      if (!detected) {
        // Privacy rule: Do not speak unless addressed by wake word
        return;
      }

      soundEffects.playConnectSound();
      this.callbacks.onWakeWordDetected?.(detected);

      // Extract command after wake word
      let stripped = rawLower;
      for (const w of wakeWords) {
        stripped = stripped.replace(w, '').trim();
      }

      // If user only greeted the wake word
      if (!stripped || stripped.length < 2) {
        const personaName = this.assistantPersona === 'jarvis' ? 'Jarvis' : 'Myra';
        const greetings = [
          `Yes Boss! ${personaName} here, fully listening. What can I do for you?`,
          `Ji Boss! Kahiye, main aapki kya madad kar sakti hoon?`,
          `At your service, Boss. Standing by for your command!`,
        ];
        this.speakResponse(greetings[Math.floor(Math.random() * greetings.length)]);
        return;
      }

      this.processUserQuery(stripped);
    } else {
      // Continuous mode
      this.processUserQuery(text);
    }
  }

  /**
   * Fast on-device local neural and conversational brain (<50ms response)
   */
  public async processUserQuery(text: string): Promise<void> {
    if (!text || text.trim().length === 0) return;

    this.callbacks.onThinking();
    soundEffects.playClickSound();

    const query = text.toLowerCase().trim();
    let responseText = '';

    // 0. Voice Audibility Check ("Meri awaz aa rahi hai", "Can you hear me", "Awaz aa rahi hai")
    if (
      query.includes('awaz') ||
      query.includes('aawaz') ||
      query.includes('hear me') ||
      query.includes('can you hear') ||
      query.includes('آواز') ||
      (query.includes('voice') && query.includes('hear'))
    ) {
      responseText = 'Ji Boss! Aap ki aawaz bilkul saaf aur wazeh aa rahi hai.';
    }
    // 1. WhatsApp Integration
    else if (query.includes('whatsapp') || query.includes('what\'s app') || query.includes('واٹس ایپ') || query.includes('message')) {
      await toolExecutor.executeTool({
        id: `off_wa_${Date.now()}`,
        name: 'openWhatsApp',
        args: { text: '' },
        timestamp: Date.now(),
      });
      responseText = 'Opening WhatsApp for you right now, Boss.';
    }
    // 1b. Facebook Integration
    else if (query.includes('facebook') || query.includes('فیس بک') || query.includes('fb')) {
      await toolExecutor.executeTool({
        id: `off_fb_${Date.now()}`,
        name: 'openFacebook',
        args: {},
        timestamp: Date.now(),
      });
      responseText = 'Opening Facebook for you now, Boss.';
    }
    // 2. Poetry and Shayari Integration
    else if (
      query.includes('poetry') ||
      query.includes('shayari') ||
      query.includes('sher') ||
      query.includes('ghalib') ||
      query.includes('iqbal')
    ) {
      const poetryResult = await toolExecutor.executeTool({
        id: `off_poet_${Date.now()}`,
        name: 'tellPoetryOrJoke',
        args: { type: 'poetry', language: 'urdu' },
        timestamp: Date.now(),
      });
      responseText = poetryResult?.content || 'ستاروں سے آگے جہاں اور بھی ہیں، ابھی عشق کے امتحاں اور بھی ہیں۔';
    }
    // 3. Joke Integration
    else if (query.includes('joke') || query.includes('latifa') || query.includes('funny')) {
      const jokeResult = await toolExecutor.executeTool({
        id: `off_joke_${Date.now()}`,
        name: 'tellPoetryOrJoke',
        args: { type: 'joke', language: 'urdu' },
        timestamp: Date.now(),
      });
      responseText = jokeResult?.content || 'Why do developers love dark mode? Because light attracts bugs!';
    }
    // 4. Reminders Integration
    else if (query.includes('remind me') || query.includes('set reminder') || query.includes('reminder')) {
      const titleMatch = text.replace(/remind me to|set reminder for|set a reminder to|reminder/gi, '').trim();
      const title = titleMatch || 'Important task';
      await toolExecutor.executeTool({
        id: `off_rem_${Date.now()}`,
        name: 'createReminder',
        args: { title, time: 'Soon' },
        timestamp: Date.now(),
      });
      responseText = `Reminder set, Boss: "${title}".`;
    }
    // 5. YouTube Integration
    else if (query.includes('youtube') || query.includes('play')) {
      const topic = text.replace(/open youtube|search youtube|play on youtube|play/gi, '').trim();
      await toolExecutor.executeTool({
        id: `off_yt_${Date.now()}`,
        name: 'openYouTube',
        args: { query: topic },
        timestamp: Date.now(),
      });
      responseText = topic ? `Playing ${topic} on YouTube, Boss.` : 'Opening YouTube for you now, Boss.';
    }
    // 6. Navigation / Maps
    else if (query.includes('maps') || query.includes('map') || query.includes('directions')) {
      const loc = text.replace(/open maps for|open maps|map of|directions to/gi, '').trim();
      await toolExecutor.executeTool({
        id: `off_map_${Date.now()}`,
        name: 'openMaps',
        args: { location: loc || 'Current location' },
        timestamp: Date.now(),
      });
      responseText = `Opening Maps for ${loc || 'navigation'}, Boss.`;
    }
    // 7. App Launcher (Calculator, Calendar, Spotify, etc.)
    else if (
      query.includes('calculator') ||
      query.includes('calendar') ||
      query.includes('spotify') ||
      query.includes('github')
    ) {
      let appName = 'calculator';
      if (query.includes('calendar')) appName = 'calendar';
      if (query.includes('spotify')) appName = 'spotify';
      if (query.includes('github')) appName = 'github';

      await toolExecutor.executeTool({
        id: `off_app_${Date.now()}`,
        name: 'launchApp',
        args: { appName },
        timestamp: Date.now(),
      });
      responseText = `Launching ${appName} for you, Boss.`;
    }
    // 8. Smart HUD Device Lighting & Overdrive
    else if (
      query.includes('ambient light') ||
      query.includes('lighting') ||
      query.includes('overdrive') ||
      query.includes('stealth')
    ) {
      let state = 'neon-cyan';
      if (query.includes('violet') || query.includes('purple')) state = 'cyber-violet';
      if (query.includes('green') || query.includes('matrix')) state = 'matrix-green';
      if (query.includes('gold') || query.includes('amber')) state = 'solar-gold';

      const device = query.includes('overdrive')
        ? 'overdrive'
        : query.includes('stealth')
        ? 'stealth'
        : 'ambientLight';
      const action = query.includes('on') || query.includes('enable') ? 'enable' : 'set';

      await toolExecutor.executeTool({
        id: `off_dev_${Date.now()}`,
        name: 'controlSmartDevices',
        args: { device, action, state: query.includes('overdrive') ? 'on' : state },
        timestamp: Date.now(),
      });
      responseText = `HUD system calibrated, Boss.`;
    }
    // 9. Urdu / Hindi Greetings & Identity
    else if (
      query.includes('salam') ||
      query.includes('kya haal') ||
      query.includes('kese ho') ||
      query.includes('kaisa hai') ||
      query.includes('kaise ho')
    ) {
      responseText = `Wa alaykumu s-salam Boss! Main bilkul theek hoon. Kahiye, aaj kya plan hai?`;
    } else if (query.includes('who are you') || query.includes('your name') || query.includes('kaun ho')) {
      responseText = `Main aapki Boss AI assistant hoon — Jarvis / Myra! Real-time voice intelligence, online aur offline dono modes mein tayyar.`;
    }
    // 10. Time & Date
    else if (query.includes('time') || query.includes('waqt')) {
      const now = new Date();
      responseText = `Boss, the time is ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
    } else if (query.includes('date') || query.includes('tareekh') || query.includes('aaj')) {
      const now = new Date();
      responseText = `Today is ${now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}, Boss.`;
    }
    // 11. Offline Math Calculations
    else if (/(\d+)\s*([\+\-\*\/])\s*(\d+)/.test(query)) {
      try {
        const match = query.match(/(\d+)\s*([\+\-\*\/])\s*(\d+)/);
        if (match) {
          const a = parseFloat(match[1]);
          const op = match[2];
          const b = parseFloat(match[3]);
          let res = 0;
          if (op === '+') res = a + b;
          if (op === '-') res = a - b;
          if (op === '*') res = a * b;
          if (op === '/') res = b !== 0 ? a / b : 0;
          responseText = `The answer is ${res}, Boss.`;
        }
      } catch {
        responseText = 'Calculation completed, Boss.';
      }
    }
    // 12. Natural Conversational Fallback
    else {
      const responses = [
        `Ji Boss, bilkul! I have noted "${text}". I am running in fast local offline mode on your system.`,
        `Right away, Boss. In offline mode, I can launch WhatsApp, YouTube, calculate, set reminders, or recite poetry!`,
        `Understood, Boss! "${text}" received. Let me know your next command.`,
      ];
      responseText = responses[Math.floor(Math.random() * responses.length)];
    }

    this.speakResponse(responseText);
  }

  /**
   * Speaks the response with natural conversational cadence and 60fps waveform animation
   */
  public speakResponse(text: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.callbacks.onTranscript('jarvis', text, true);
      return;
    }

    this.interrupt();
    this.isSpeaking = true;
    this.lastSpokenText = text;
    this.callbacks.onSpeakingStart(text);
    this.callbacks.onTranscript('jarvis', text, true);

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.preferredVoice) {
      utterance.voice = this.preferredVoice;
    }
    utterance.rate = 1.15; // Snappy direct voice output
    utterance.pitch = 1.04;

    this.startWaveformSimulation();

    utterance.onend = () => {
      this.stopWaveformSimulation();
      this.isSpeaking = false;
      this.callbacks.onSpeakingEnd();
      this.callbacks.onListening();
    };

    utterance.onerror = (e) => {
      console.warn('[OfflineVoiceEngine] Speech synthesis notice:', e);
      this.stopWaveformSimulation();
      this.isSpeaking = false;
      this.callbacks.onSpeakingEnd();
      this.callbacks.onListening();
    };

    window.speechSynthesis.speak(utterance);
  }

  private startWaveformSimulation() {
    this.stopWaveformSimulation();
    const freqs = new Uint8Array(64);
    let phase = 0;

    const tick = () => {
      if (!this.isSpeaking) return;

      phase += 0.15;
      const baseLevel = 0.45 + Math.sin(phase) * 0.35;

      for (let i = 0; i < freqs.length; i++) {
        const val = Math.floor(
          Math.sin(phase + i * 0.25) * 80 +
          Math.cos(phase * 1.5 + i * 0.1) * 60 +
          110
        );
        freqs[i] = Math.max(10, Math.min(255, val));
      }

      this.callbacks.onOutputLevel(baseLevel, freqs);
      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  private stopWaveformSimulation() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.callbacks.onOutputLevel(0, new Uint8Array(64));
  }

  public interrupt(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.stopWaveformSimulation();
    if (this.isSpeaking) {
      this.isSpeaking = false;
      this.callbacks.onInterrupted();
      this.callbacks.onSpeakingEnd();
    }
  }

  public stop(): void {
    this.isExplicitlyStopped = true;
    this.interrupt();
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.recognition = null;
    }
    this.isListening = false;
  }
}
