import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Sparkles, Youtube, MessageCircle, Share2, Music, RefreshCw } from 'lucide-react';
import { soundEffects } from '../utils/streamUtils';

interface VoiceRecorderBoxProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  assistantName?: string;
  isSpeaking?: boolean;
}

export const VoiceRecorderBox: React.FC<VoiceRecorderBoxProps> = ({
  onSend,
  disabled = false,
  assistantName = 'Noira / Myra',
  isSpeaking = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'ur-PK' | 'en-US' | 'hi-IN'>('ur-PK');
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage;

      recognition.onresult = (event: any) => {
        let fullText = '';
        for (let i = 0; i < event.results.length; ++i) {
          fullText += event.results[i][0].transcript;
        }
        if (fullText.trim()) {
          setTranscript(fullText.trim());
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('[VoiceRecorderBox] Speech recognition notice:', event.error);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {}
      }
    };
  }, [selectedLanguage]);

  // Toggle Recording On / Off
  const toggleRecording = () => {
    soundEffects.playClickSound();

    if (isRecording) {
      // Stop recording
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsRecording(false);
    } else {
      // Start recording
      setTranscript('');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.lang = selectedLanguage;
          recognitionRef.current.start();
          setIsRecording(true);
        } catch (err) {
          console.warn('[VoiceRecorderBox] Start error:', err);
          setIsRecording(false);
        }
      }
    }
  };

  // Submit spoken or typed text
  const handleSend = () => {
    if (!transcript.trim() || disabled) return;

    // Stop recording if active
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsRecording(false);
    }

    soundEffects.playClickSound();
    const textToSend = transcript.trim();
    onSend(textToSend);
    setTranscript('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickCommand = (cmd: string) => {
    soundEffects.playClickSound();
    setTranscript(cmd);
    onSend(cmd);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 select-none animate-fade-in flex flex-col items-center gap-2">
      {/* Recording Control & Input Box Container */}
      <div className="w-full relative flex flex-col p-2.5 rounded-2xl border border-cyan-500/30 bg-[#070B1E]/95 backdrop-blur-2xl shadow-[0_0_30px_rgba(0,229,255,0.18)] transition-all">
        {/* Top bar with Language Selector & Recording Indicator */}
        <div className="flex items-center justify-between pb-1.5 px-2 border-b border-white/10 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isRecording
                  ? 'bg-red-500 animate-ping'
                  : isSpeaking
                  ? 'bg-cyan-400 animate-pulse'
                  : 'bg-emerald-400'
              }`}
            />
            <span className="font-semibold uppercase tracking-wider text-slate-300">
              {isRecording
                ? 'ریکارڈنگ جاری ہے... (بولیں)'
                : isSpeaking
                ? `${assistantName} بول رہی ہے...`
                : 'ٹیپ کر کے بولیں یا لکھیں'}
            </span>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 hidden sm:inline">زبان:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as any)}
              className="bg-black/60 border border-white/15 rounded-md px-1.5 py-0.5 text-[10px] text-cyan-300 focus:outline-none"
            >
              <option value="ur-PK">اردو (Urdu)</option>
              <option value="en-US">English</option>
              <option value="hi-IN">हिन्दी (Hindi)</option>
            </select>
          </div>
        </div>

        {/* Input Area + Record Button + Send Button */}
        <div className="flex items-center gap-2 pt-2">
          {/* 1-Tap Record Button */}
          <button
            type="button"
            onClick={toggleRecording}
            title={isRecording ? 'ریکارڈنگ روکیں' : 'بولنے کے لیے ٹیپ کریں'}
            className={`flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-300 shrink-0 shadow-lg ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-red-500/40 ring-2 ring-red-400'
                : 'bg-gradient-to-br from-violet-600 to-cyan-500 hover:brightness-110 text-white shadow-cyan-500/20'
            }`}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Live Typing & Transcribing Box */}
          <div className="relative flex-1">
            <input
              type="text"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isRecording
                  ? 'آپ جو بول رہے ہیں وہ یہاں لکھا جا رہا ہے...'
                  : 'یہاں بولیں یا ٹائپ کریں (مثلاً: یوٹیوب کھولو)...'
              }
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400/60 font-sans tracking-wide transition-all"
            />
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!transcript.trim() || disabled}
            title="بھیجیں (Send)"
            className="flex items-center justify-center gap-1 px-4 h-11 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-30 disabled:hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md shrink-0 active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">بھیجیں</span>
          </button>
        </div>
      </div>

      {/* Quick 1-Tap Voice Test Chips */}
      <div className="w-full flex items-center justify-center flex-wrap gap-1.5 pt-1 text-[11px] font-sans">
        <button
          onClick={() => handleQuickCommand('میری آواز آپ کو آرہی ہے؟')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-300 transition-colors"
        >
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>میری آواز آرہی ہے؟</span>
        </button>

        <button
          onClick={() => handleQuickCommand('یوٹیوب کھولو')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-red-500/20 bg-red-950/30 hover:bg-red-950/50 text-red-300 hover:text-red-200 transition-colors"
        >
          <Youtube className="w-3 h-3 text-red-400" />
          <span>یوٹیوب کھولو</span>
        </button>

        <button
          onClick={() => handleQuickCommand('واٹس ایپ کھولو')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-950/30 hover:bg-emerald-950/50 text-emerald-300 hover:text-emerald-200 transition-colors"
        >
          <MessageCircle className="w-3 h-3 text-emerald-400" />
          <span>واٹس ایپ کھولو</span>
        </button>

        <button
          onClick={() => handleQuickCommand('فیس بک کھولو')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-blue-500/20 bg-blue-950/30 hover:bg-blue-950/50 text-blue-300 hover:text-blue-200 transition-colors"
        >
          <Share2 className="w-3 h-3 text-blue-400" />
          <span>فیس بک کھولو</span>
        </button>

        <button
          onClick={() => handleQuickCommand('کوئی اچھا شعر سناؤ')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-purple-500/20 bg-purple-950/30 hover:bg-purple-950/50 text-purple-300 hover:text-purple-200 transition-colors"
        >
          <Music className="w-3 h-3 text-purple-400" />
          <span>شعر سناؤ</span>
        </button>
      </div>
    </div>
  );
};
