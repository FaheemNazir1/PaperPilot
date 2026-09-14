import React from 'react';
import { ChatMessage, CitationItem } from '../../types';
import { Bot, User, BookOpen, Copy, Check, Sparkles } from 'lucide-react';
import { Badge } from '../common/Badge';

interface ChatMessageItemProps {
  message: ChatMessage;
  onCitationClick: (citation: CitationItem) => void;
  onFollowUpClick?: (prompt: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onCitationClick,
  onFollowUpClick
}) => {
  const isAssistant = message.sender === 'assistant';
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex gap-3 sm:gap-4 p-4 rounded-xl transition-colors ${
        isAssistant
          ? 'bg-zinc-900/50 border border-zinc-850'
          : 'bg-zinc-950/40'
      }`}
    >
      {/* Sender Avatar */}
      <div
        className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-semibold ${
          isAssistant
            ? 'bg-accent-600/20 text-accent-300 border border-accent-500/40 shadow-xs'
            : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
        }`}
      >
        {isAssistant ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      {/* Message Body */}
      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-200">
              {isAssistant ? 'PaperPilot AI' : 'You'}
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              {message.timestamp}
            </span>
          </div>

          {isAssistant && (
            <button
              onClick={handleCopy}
              className="text-zinc-500 hover:text-zinc-300 p-1 rounded transition-colors"
              title="Copy answer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Message Text with markdown formatting */}
        <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-line space-y-2">
          {message.text}
        </div>

        {/* Grounded Citation Sources */}
        {message.citations && message.citations.length > 0 && (
          <div className="pt-2 border-t border-zinc-800/80">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1.5 font-semibold">
              Grounded Evidence & Sources (Click to inspect excerpt):
            </span>
            <div className="flex flex-wrap gap-2">
              {message.citations.map((cit) => (
                <button
                  key={cit.id}
                  onClick={() => onCitationClick(cit)}
                  className="text-xs px-2.5 py-1 rounded-md bg-zinc-950 border border-zinc-750 hover:border-accent-500/60 hover:bg-zinc-900 transition-all flex items-center gap-1.5 text-zinc-300 group shadow-xs"
                >
                  <BookOpen className="w-3 h-3 text-accent-400 group-hover:scale-110 transition-transform" />
                  <span className="font-mono text-accent-300 font-medium">
                    {cit.citationLabel}
                  </span>
                  <span className="text-zinc-500 truncate max-w-[160px] text-[11px]">
                    {cit.paperTitle}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Follow-up chips */}
        {message.suggestedFollowUps && message.suggestedFollowUps.length > 0 && (
          <div className="pt-2 flex flex-wrap gap-1.5">
            {message.suggestedFollowUps.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => onFollowUpClick?.(prompt)}
                className="text-xs px-2.5 py-1 rounded-md bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-750 transition-colors"
              >
                + {prompt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
