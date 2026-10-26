import React, { useState } from 'react';
import { Send, Keyboard, X } from 'lucide-react';
import { soundEffects } from '../utils/streamUtils';
import { ConnectionMode } from '../types/session.types';

interface TextInputBackupProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  mode?: ConnectionMode;
}

export const TextInputBackup: React.FC<TextInputBackupProps> = ({
  onSend,
  disabled = false,
  mode = 'online',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    soundEffects.playClickSound();
    onSend(text.trim());
    setText('');
  };

  return (
    <div className="w-full max-w-xl px-4 select-none">
      {!isOpen ? (
        <div className="flex justify-center">
          <button
            onClick={() => {
              soundEffects.playClickSound();
              setIsOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-cyan-300 transition-all font-mono text-xs backdrop-blur-md shadow-sm"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>BACKUP TEXT INPUT</span>
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center gap-2 p-1.5 rounded-2xl border border-cyan-500/30 bg-[#070B1E]/90 backdrop-blur-xl shadow-[0_0_20px_rgba(0,229,255,0.15)] animate-fade-in"
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Ask Myra (مایرا) anything (${mode === 'offline' ? 'offline' : 'online'})...`}
            disabled={disabled}
            autoFocus
            className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-slate-500 font-sans focus:outline-none"
          />

          <button
            type="submit"
            disabled={!text.trim() || disabled}
            className="flex items-center justify-center p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:hover:bg-cyan-500 text-black transition-all shadow-md"
            title="Send to Myra"
          >
            <Send className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              soundEffects.playClickSound();
              setIsOpen(false);
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-300 transition-colors"
            title="Close text input"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
};
