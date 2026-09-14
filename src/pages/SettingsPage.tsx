import React, { useState } from 'react';
import { Settings, Sliders, Cpu, BookOpen, Download, Server, Check, Save, FileText, Globe } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useToast } from '../context/ToastContext';

export const SettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const [appearance, setAppearance] = useState<'dark' | 'light' | 'system'>('dark');
  const [citationStyle, setCitationStyle] = useState('IEEE');
  const [reviewLength, setReviewLength] = useState('Medium');
  const [modelOption, setModelOption] = useState('local-mistral');
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000/api/v1');

  const citationOptions = ['IEEE', 'APA 7th', 'Nature', 'ACM', 'Harvard'];
  const lengthOptions = ['Brief', 'Medium', 'Comprehensive'];

  const modelOptions = [
    {
      id: 'local-mistral',
      name: 'PaperPilot Local Scholar (Ollama / Mistral-7B-Instruct)',
      desc: 'Optimized for CPU & consumer GPUs. 100% offline, privacy-first literature extraction.',
      tag: 'Self-Hosted / Cost-Effective'
    },
    {
      id: 'local-scholar-8b',
      name: 'Open-Source Bio/Sci-LLM (vLLM / LLaMA-3-8B-Science)',
      desc: 'High-throughput dense vector grounding with scientific tokenization.',
      tag: 'Local GPU Accelerated'
    },
    {
      id: 'custom-fastapi',
      name: 'Custom FastAPI RAG Pipeline',
      desc: 'Connects directly to your future Python FastAPI vector search backend.',
      tag: 'FastAPI Backend Ready'
    }
  ];

  const handleSave = () => {
    showToast('Workspace settings saved successfully', 'success');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-accent-400" />
            <span>Workspace Settings</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Configure academic citation defaults, inference backend, and export behaviors
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Save className="w-3.5 h-3.5" />}
          onClick={handleSave}
        >
          Save Preferences
        </Button>
      </div>

      <div className="space-y-6">
        {/* 1. Appearance Section */}
        <Card className="p-5 bg-zinc-900/60 border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-100 mb-1 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-accent-400" />
            <span>1. Appearance</span>
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Select the visual theme for your research workspace.
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-md">
            {(['dark', 'light', 'system'] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => {
                  setAppearance(theme);
                  showToast(`Switched to ${theme} appearance`, 'info');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-medium capitalize border transition-all text-center ${
                  appearance === theme
                    ? 'bg-zinc-100 text-zinc-900 border-zinc-200 font-semibold shadow-xs'
                    : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                {theme} Mode
              </button>
            ))}
          </div>
        </Card>

        {/* 2. Citation Preferences */}
        <Card className="p-5 bg-zinc-900/60 border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-100 mb-1 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent-400" />
            <span>2. Citation Preferences</span>
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Default bibliography and in-text citation format applied across synthesized documents.
          </p>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Default Citation Style
            </label>
            <div className="flex flex-wrap gap-1.5">
              {citationOptions.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setCitationStyle(style)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    citationStyle === style
                      ? 'bg-accent-600 text-white font-semibold'
                      : 'bg-zinc-950/60 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* 3. Literature Review Defaults */}
        <Card className="p-5 bg-zinc-900/60 border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-100 mb-1 flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent-400" />
            <span>3. Literature Review Defaults</span>
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Synthesis depth and section focus presets applied to new review generations.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Default Synthesis Depth
              </label>
              <div className="flex flex-wrap gap-1.5">
                {lengthOptions.map((len) => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => setReviewLength(len)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      reviewLength === len
                        ? 'bg-accent-600 text-white font-semibold'
                        : 'bg-zinc-950/60 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800 text-xs text-zinc-300 space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-zinc-700 text-accent-600 bg-zinc-900" />
                <span>Automatically include structured methodology comparison section</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-zinc-700 text-accent-600 bg-zinc-900" />
                <span>Highlight identified open research gaps in conclusion section</span>
              </label>
            </div>
          </div>
        </Card>

        {/* 4. AI Configuration (Placeholders for Future Backend) */}
        <Card className="p-5 bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-accent-400" />
              <span>4. AI Configuration</span>
            </h3>
            <Badge variant="accent" size="sm" className="font-mono text-[10px]">
              Configuration Placeholder
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mb-4">
            Select the inference architecture for grounded RAG synthesis. Configured for upcoming FastAPI integration (no active external models connected).
          </p>

          <div className="space-y-2.5">
            {modelOptions.map((opt) => (
              <div
                key={opt.id}
                onClick={() => setModelOption(opt.id)}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                  modelOption === opt.id
                    ? 'bg-zinc-850/80 border-accent-500/60 ring-1 ring-accent-500/30'
                    : 'bg-zinc-950/40 border-zinc-800/80 hover:border-zinc-700/60'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        modelOption === opt.id
                          ? 'border-accent-400 bg-accent-500'
                          : 'border-zinc-600'
                      }`}
                    >
                      {modelOption === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-xs font-semibold text-zinc-200">
                      {opt.name}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 pl-5 leading-relaxed">
                    {opt.desc}
                  </p>
                </div>
                <Badge variant="outline" size="sm" className="shrink-0 text-[10px] font-mono">
                  {opt.tag}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* 5. Backend Connection */}
        <Card className="p-5 bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Server className="w-4 h-4 text-accent-400" />
              <span>5. Backend Connection</span>
            </h3>
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Mock Service Layer Connected
            </span>
          </div>
          <p className="text-xs text-zinc-400 mb-3">
            FastAPI endpoint configuration. Ready to connect when the backend is deployed.
          </p>

          <div className="max-w-md">
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent-500/50"
            />
            <p className="text-[11px] text-zinc-500 mt-1.5 font-mono">
              Target Endpoints: /api/papers, /api/upload, /api/review, /api/chat
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
