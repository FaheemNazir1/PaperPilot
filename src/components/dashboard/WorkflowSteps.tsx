import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, BookOpenCheck, GitCompare, Lightbulb, FileText, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export const WorkflowSteps: React.FC = () => {
  const navigate = useNavigate();

  const steps = [
    {
      num: '1',
      title: 'Upload Papers',
      desc: 'Ingest scientific PDFs',
      icon: Upload,
      path: '/upload',
    },
    {
      num: '2',
      title: 'Understand',
      desc: 'Extracted methods & findings',
      icon: BookOpenCheck,
      path: '/papers',
    },
    {
      num: '3',
      title: 'Compare',
      desc: 'Cross-paper differences',
      icon: GitCompare,
      path: '/compare',
    },
    {
      num: '4',
      title: 'Find Gaps',
      desc: 'Uncovered opportunities',
      icon: Lightbulb,
      path: '/research-gaps',
    },
    {
      num: '5',
      title: 'Generate Review',
      desc: 'Structured manuscript',
      icon: FileText,
      path: '/literature-review',
      isHero: true,
    },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-medium">
          Literature Review Pipeline
        </span>
        <span className="text-[11px] text-zinc-400">
          5 stages from PDFs to manuscript
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <button
              key={step.num}
              onClick={() => navigate(step.path)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border text-left transition-all group relative',
                step.isHero
                  ? 'bg-accent-600/10 border-accent-500/40 hover:bg-accent-600/15 hover:border-accent-500/60'
                  : 'bg-zinc-950/60 border-zinc-850 hover:bg-zinc-900/60 hover:border-zinc-750'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold shrink-0 transition-colors',
                  step.isHero
                    ? 'bg-accent-500 text-white shadow-xs'
                    : 'bg-zinc-850 text-zinc-300 group-hover:bg-zinc-800 group-hover:text-white'
                )}
              >
                {step.num}
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    'text-xs font-medium truncate flex items-center gap-1',
                    step.isHero ? 'text-accent-300 font-semibold' : 'text-zinc-200'
                  )}
                >
                  <Icon className="w-3 h-3 shrink-0 opacity-70" />
                  <span className="truncate">{step.title}</span>
                </div>
                <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                  {step.desc}
                </div>
              </div>

              {idx < steps.length - 1 && (
                <ChevronRight className="hidden lg:block w-3.5 h-3.5 text-zinc-700 absolute -right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
