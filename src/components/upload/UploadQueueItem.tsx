import React from 'react';
import { UploadItem } from '../../types';
import { FileText, X, CheckCircle2, Loader2, Sparkles, BrainCircuit } from 'lucide-react';
import { Badge } from '../common/Badge';

interface UploadQueueItemProps {
  item: UploadItem;
  onRemove: (id: string) => void;
}

export const UploadQueueItem: React.FC<UploadQueueItemProps> = ({ item, onRemove }) => {
  const getStatusBadge = () => {
    switch (item.status) {
      case 'ready':
      case 'indexed':
        return (
          <Badge variant="success" size="sm">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Ready for Research</span>
          </Badge>
        );
      case 'analyzing':
        return (
          <Badge variant="accent" size="sm">
            <BrainCircuit className="w-3 h-3 animate-spin text-accent-400" />
            <span>Analyzing papers...</span>
          </Badge>
        );
      case 'extracting':
        return (
          <Badge variant="accent" size="sm">
            <Loader2 className="w-3 h-3 animate-spin text-accent-400" />
            <span>Extracting text...</span>
          </Badge>
        );
      case 'uploading':
        return (
          <Badge variant="neutral" size="sm">
            <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
            <span>Uploading...</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" size="sm">
            <span>Uploaded</span>
          </Badge>
        );
    }
  };

  return (
    <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/90 rounded-xl flex items-center justify-between gap-4 hover:border-zinc-700/70 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-lg bg-zinc-850 border border-zinc-700/50 flex items-center justify-center text-zinc-300 shrink-0">
          <FileText className="w-4 h-4 text-accent-400" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h5 className="text-xs font-medium text-zinc-100 truncate">
              {item.name}
            </h5>
            <span className="text-[11px] font-mono text-zinc-400 shrink-0">
              {item.size}
            </span>
          </div>

          <div className="mt-1.5 flex items-center gap-3">
            {getStatusBadge()}
            {item.pages && (
              <span className="text-[11px] text-zinc-400 font-mono">
                {item.pages} pages extracted
              </span>
            )}
          </div>

          {/* Mini Progress Bar */}
          {item.status !== 'ready' && item.status !== 'indexed' && (
            <div className="mt-2 w-full max-w-xs bg-zinc-800 rounded-full h-1 overflow-hidden">
              <div
                className="bg-accent-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => onRemove(item.id)}
        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        title="Remove file"
        aria-label="Remove file"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
