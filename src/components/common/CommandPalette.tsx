import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  FileText,
  Upload,
  BookOpen,
  GitCompare,
  Lightbulb,
  Bot,
  Settings,
  ArrowRight,
  Sparkles,
  X
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  category: 'Actions' | 'Navigation' | 'Research Tools';
  path: string;
  icon: React.ElementType;
  shortcut?: string;
  description: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    {
      id: 'search-papers',
      label: 'Search papers',
      category: 'Research Tools',
      path: '/papers',
      icon: Search,
      description: 'Search through 12 indexed scientific papers'
    },
    {
      id: 'upload-papers',
      label: 'Upload papers',
      category: 'Actions',
      path: '/upload',
      icon: Upload,
      shortcut: 'U',
      description: 'Ingest and extract new PDF documents'
    },
    {
      id: 'generate-review',
      label: 'Generate literature review',
      category: 'Actions',
      path: '/literature-review',
      icon: BookOpen,
      shortcut: 'R',
      description: 'Create multi-paper structured synthesis with IEEE citations'
    },
    {
      id: 'compare-papers',
      label: 'Compare papers',
      category: 'Research Tools',
      path: '/compare',
      icon: GitCompare,
      shortcut: 'C',
      description: 'Open side-by-side methodology & benchmark matrix'
    },
    {
      id: 'ask-assistant',
      label: 'Ask PaperPilot AI',
      category: 'Research Tools',
      path: '/assistant',
      icon: Bot,
      shortcut: 'A',
      description: 'Ask questions with citation-grounded answers'
    },
    {
      id: 'view-gaps',
      label: 'Explore research gaps',
      category: 'Research Tools',
      path: '/research-gaps',
      icon: Lightbulb,
      description: 'View 2D Opportunity Map & unexplored thesis directions'
    },
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      category: 'Navigation',
      path: '/dashboard',
      icon: Sparkles,
      description: 'View research overview & statistics'
    },
    {
      id: 'settings',
      label: 'Workspace settings',
      category: 'Navigation',
      path: '/settings',
      icon: Settings,
      shortcut: 'S',
      description: 'Configure citation styles and local inference model'
    }
  ];

  const filteredCommands = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.description.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          navigate(filteredCommands[selectedIndex].path);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, navigate, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-750 rounded-xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col">
        {/* Search input */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-800">
          <Search className="w-4 h-4 text-zinc-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search workspace..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-zinc-500 hover:text-zinc-300 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-zinc-800 border border-zinc-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div className="max-h-80 overflow-y-auto custom-scrollbar p-2">
          {filteredCommands.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500">
              No matching commands or actions found.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCommands.map((command, idx) => {
                const Icon = command.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={command.id}
                    onClick={() => {
                      navigate(command.path);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs',
                      isSelected
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors',
                          isSelected
                            ? 'bg-zinc-700 text-accent-300'
                            : 'bg-zinc-800 text-zinc-400'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-zinc-200 truncate">
                          {command.label}
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate">
                          {command.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-zinc-500 uppercase font-mono">
                        {command.category}
                      </span>
                      {command.shortcut && (
                        <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-zinc-850 rounded border border-zinc-750">
                          {command.shortcut}
                        </kbd>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 bg-zinc-950/60 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span>PaperPilot AI Assistant</span>
        </div>
      </div>
    </div>
  );
};
