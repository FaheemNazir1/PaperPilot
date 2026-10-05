import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, BookOpen, GitCompare, Bot } from 'lucide-react';

export const QuickActionsBar: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Upload Papers',
      desc: 'Add new scientific PDFs',
      icon: Upload,
      path: '/upload',
    },
    {
      title: 'Create Review',
      desc: 'Generate manuscript',
      icon: BookOpen,
      path: '/literature-review',
    },
    {
      title: 'Compare Papers',
      desc: 'Matrix of methodologies',
      icon: GitCompare,
      path: '/compare',
    },
    {
      title: 'Ask PaperPilot',
      desc: 'Query papers with AI',
      icon: Bot,
      path: '/assistant',
    },
  ];

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-medium">
        Quick Research Actions
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.title}
              onClick={() => navigate(act.path)}
              className="p-3 rounded-lg border border-zinc-850 bg-zinc-950/60 hover:bg-zinc-900/60 hover:border-zinc-750 transition-all text-left group"
            >
              <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 group-hover:text-accent-400 group-hover:border-accent-500/40 transition-colors mb-2">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors truncate">
                {act.title}
              </div>
              <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                {act.desc}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
