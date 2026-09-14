import React from 'react';
import { Upload, BookOpen, Search, GitCompare, Lightbulb, FileText, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const WorkflowBanner: React.FC = () => {
  const navigate = useNavigate();

  const steps = [
    { label: 'Upload Papers', path: '/upload', icon: Upload, desc: 'Ingest PDFs' },
    { label: 'Understand', path: '/papers', icon: FileText, desc: 'Deep Summaries' },
    { label: 'Search & Query', path: '/assistant', icon: Search, desc: 'Semantic RAG' },
    { label: 'Compare Papers', path: '/compare', icon: GitCompare, desc: 'Methods & Data' },
    { label: 'Research Gaps', path: '/research-gaps', icon: Lightbulb, desc: 'Open Challenges' },
    { label: 'Literature Review', path: '/literature-review', icon: BookOpen, desc: 'Synthesis & Citations' },
  ];

  return (
    <div className="p-4 bg-zinc-900/40 border border-zinc-800/90 rounded-xl overflow-hidden shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-accent-400 font-semibold">
            PaperPilot Research Pipeline
          </span>
        </div>
        <span className="text-[11px] text-zinc-500 font-mono">
          Integrated scientific literature workflow
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <button
              key={step.label}
              onClick={() => navigate(step.path)}
              className="p-2.5 rounded-lg bg-zinc-950/50 hover:bg-zinc-850/80 border border-zinc-850 hover:border-zinc-700 transition-all text-left group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-zinc-500 group-hover:text-accent-400 transition-colors">
                  0{idx + 1}
                </span>
                <Icon className="w-3.5 h-3.5 text-zinc-400 group-hover:text-accent-400 transition-colors" />
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors truncate">
                  {step.label}
                </div>
                <div className="text-[10px] text-zinc-500 truncate mt-0.5 font-mono">
                  {step.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
