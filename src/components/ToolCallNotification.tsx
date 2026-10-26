import React from 'react';
import { ToolExecutionRecord } from '../types/tool.types';
import { ExternalLink, CheckCircle2, AlertCircle, Wrench, X } from 'lucide-react';

interface ToolCallNotificationProps {
  record: ToolExecutionRecord | null;
  onDismiss: () => void;
}

export const ToolCallNotification: React.FC<ToolCallNotificationProps> = ({
  record,
  onDismiss,
}) => {
  if (!record) return null;

  return (
    <div className="fixed top-6 right-6 z-50 animate-slide-left max-w-sm w-full p-4 rounded-xl border border-cyan-500/40 bg-slate-950/90 backdrop-blur-2xl text-slate-200 shadow-[0_0_30px_rgba(0,229,255,0.2)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider">
          <Wrench className="w-3.5 h-3.5" />
          <span>TOOL EXECUTED: {record.name}()</span>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="mt-2 text-sm text-slate-200 font-sans leading-snug">
        {record.message}
      </p>

      {record.args && Object.keys(record.args).length > 0 && (
        <div className="mt-2.5 p-2 rounded bg-black/40 border border-white/5 font-mono text-[11px] text-slate-400 overflow-x-auto">
          {Object.entries(record.args).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="text-purple-400">{k}:</span>
              <span className="text-cyan-300 truncate">{String(v)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <span className="flex items-center gap-1 text-emerald-400">
          <CheckCircle2 className="w-3 h-3" /> SUCCESS
        </span>
        <span>{new Date(record.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
};
