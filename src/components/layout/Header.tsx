import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  BookOpen,
  Upload,
  User,
  Settings,
  ChevronDown,
  Check,
  Sparkles,
  Command
} from 'lucide-react';
import { Button } from '../common/Button';
import { CommandPalette } from '../common/CommandPalette';
import { useToast } from '../../context/ToastContext';

interface HeaderProps {
  onOpenMobileNav: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileNav,
  isSidebarCollapsed,
  onToggleSidebarCollapse
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Listen for global Cmd+K or Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileDropdownOpen]);

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'Dashboard';
    if (path.startsWith('/papers')) return 'My Papers';
    if (path.startsWith('/upload')) return 'Upload Research Papers';
    if (path.startsWith('/literature-review')) return 'Literature Review Generator';
    if (path.startsWith('/compare')) return 'Compare Papers Matrix';
    if (path.startsWith('/research-gaps')) return 'Research Gaps & Map';
    if (path.startsWith('/assistant')) return 'PaperPilot AI Assistant';
    if (path.startsWith('/settings')) return 'Settings';
    return 'Workspace';
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-16 w-full bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between">
        {/* Left: Mobile Toggle & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileNav}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850 lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-300 font-medium hidden sm:inline">PaperPilot</span>
            <span className="text-zinc-600 hidden sm:inline">/</span>
            <span className="text-zinc-100 font-semibold">{getBreadcrumb()}</span>
          </div>
        </div>

        {/* Center: Command Palette Trigger */}
        <div className="hidden md:flex items-center max-w-md w-full mx-4">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-all shadow-2xs group"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-accent-400 transition-colors" />
              <span>Search papers, commands, tools...</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-400 bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 rounded">
              <Command className="w-3 h-3 inline" />
              <span>K</span>
            </div>
          </button>
        </div>

        {/* Right: Paper Index Status, Quick CTAs & Profile Menu */}
        <div className="flex items-center gap-3">
          {/* Index status */}
          <div className="hidden xl:flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/60 px-2.5 py-1 rounded-md border border-zinc-800/60 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>12 Papers Indexed</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<BookOpen className="w-3.5 h-3.5 text-zinc-400" />}
            onClick={() => navigate('/literature-review')}
            className="hidden sm:inline-flex"
          >
            Review
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Upload className="w-3.5 h-3.5" />}
            onClick={() => navigate('/upload')}
          >
            <span className="hidden sm:inline">Upload</span>
            <span className="sm:hidden">+</span>
          </Button>

          {/* User Profile Menu Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-accent-600/30 text-accent-300 font-semibold flex items-center justify-center text-[10px] border border-accent-500/40">
                RP
              </div>
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-750 rounded-xl shadow-2xl p-1.5 text-xs z-50 animate-in zoom-in-95 duration-100">
                <div className="p-2.5 border-b border-zinc-800">
                  <div className="font-semibold text-zinc-100">Researcher Profile</div>
                  <div className="text-[11px] text-zinc-400 font-mono truncate">
                    Academic Research Lab
                  </div>
                  <div className="text-[10px] text-accent-400 mt-1 flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    Local Workspace Active
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      setCommandPaletteOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-left"
                  >
                    <span>Command Palette</span>
                    <kbd className="font-mono text-[10px] text-zinc-500">⌘K</kbd>
                  </button>
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-left"
                  >
                    <Settings className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Workspace Settings</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-zinc-800">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      showToast('Workspace cache synchronized (12 papers)', 'success');
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors text-left text-[11px]"
                  >
                    <span>Sync Workspace</span>
                    <Check className="w-3 h-3 text-emerald-400" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
};
