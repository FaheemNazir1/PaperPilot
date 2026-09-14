import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { BookOpen, Sparkles, Sliders, Check } from 'lucide-react';

interface ReviewSetupPanelProps {
  onGenerate: (config: {
    topic: string;
    style: string;
    length: string;
    focusAreas: string[];
  }) => void;
  isGenerating: boolean;
}

export const ReviewSetupPanel: React.FC<ReviewSetupPanelProps> = ({
  onGenerate,
  isGenerating
}) => {
  const [topic, setTopic] = useState('Multimodal Physiological Stress Detection & Affective Computing');
  const [selectedStyle, setSelectedStyle] = useState('IEEE');
  const [selectedLength, setSelectedLength] = useState('Medium');
  const [focusAreas, setFocusAreas] = useState<string[]>([
    'Methods',
    'Results',
    'Limitations',
    'Research Gaps'
  ]);

  const styleOptions = ['IEEE', 'APA 7th', 'Nature', 'ACM', 'Harvard'];
  const lengthOptions = [
    { label: 'Brief', desc: 'Executive Summary (~800w)' },
    { label: 'Medium', desc: 'Systematic Synthesis (~1,800w)' },
    { label: 'Comprehensive', desc: 'Full Survey (~3,500w)' }
  ];
  const availableFocusAreas = [
    'Methods',
    'Results',
    'Limitations',
    'Research Gaps',
    'Dataset Benchmarks',
    'Theoretical Foundations'
  ];

  const toggleFocusArea = (area: string) => {
    if (focusAreas.includes(area)) {
      if (focusAreas.length > 1) {
        setFocusAreas(focusAreas.filter(a => a !== area));
      }
    } else {
      setFocusAreas([...focusAreas, area]);
    }
  };

  const handleGenerateClick = () => {
    onGenerate({
      topic,
      style: selectedStyle,
      length: selectedLength,
      focusAreas
    });
  };

  return (
    <Card className="p-6 bg-zinc-900/60 border border-zinc-800/80">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-accent-600/20 text-accent-400 border border-accent-500/30">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Review Configuration & Scope
            </h3>
            <p className="text-xs text-zinc-400">
              Configure parameters for automated multi-paper synthesis
            </p>
          </div>
        </div>

        <Badge variant="accent" size="sm" className="font-mono">
          12 Papers In Scope
        </Badge>
      </div>

      <div className="space-y-4">
        {/* Research Topic Input */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
            Research Topic or Question
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-accent-500/50 focus:border-accent-500/50 font-sans"
            placeholder="e.g. Multimodal Deep Learning for Climate & Environmental Modeling"
          />
        </div>

        {/* Style & Length Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Citation / Review Style */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Citation & Publishing Style
            </label>
            <div className="flex flex-wrap gap-1.5">
              {styleOptions.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setSelectedStyle(style)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedStyle === style
                      ? 'bg-zinc-100 text-zinc-900 font-semibold shadow-xs'
                      : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700/50'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Review Length */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Synthesis Depth & Length
            </label>
            <div className="flex flex-wrap gap-1.5">
              {lengthOptions.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setSelectedLength(item.label)}
                  title={item.desc}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedLength === item.label
                      ? 'bg-zinc-100 text-zinc-900 font-semibold shadow-xs'
                      : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700/50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Focus Areas Multi-select Chips */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
            Key Focus Areas
          </label>
          <div className="flex flex-wrap gap-2">
            {availableFocusAreas.map((area) => {
              const selected = focusAreas.includes(area);
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleFocusArea(area)}
                  className={`px-2.5 py-1 rounded-md text-xs transition-colors flex items-center gap-1.5 ${
                    selected
                      ? 'bg-accent-600/20 text-accent-300 border border-accent-500/40 font-medium'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  {selected && <Check className="w-3 h-3 text-accent-400" />}
                  <span>{area}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary CTA Button */}
        <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-mono">
            Grounding across 12 indexed full-text papers
          </span>
          <Button
            variant="primary"
            size="md"
            isLoading={isGenerating}
            leftIcon={<Sparkles className="w-4 h-4" />}
            onClick={handleGenerateClick}
          >
            {isGenerating ? 'Synthesizing Literature Review...' : 'Generate Literature Review'}
          </Button>
        </div>
      </div>
    </Card>
  );
};
