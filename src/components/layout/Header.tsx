import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Settings,
  ChevronDown,
  Command,
  LogOut
} from 'lucide-react';
import { CommandPalette } from '../common/CommandPalette';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

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
  const { currentUser, signOut } = useAuth();

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
    if (path === '/' || path === '/dashboard') return 'Workspace';
    if (path.startsWith('/papers')) return 'My Papers';
    if (path.startsWith('/upload')) return 'Upload Papers';
    if (path.startsWith('/literature-review')) return 'Literature Review';
    if (path.startsWith('/compare')) return 'Compare Papers';
    if (path.startsWith('/research-gaps')) return 'Research Gaps';
    if (path.startsWith('/assistant')) return 'AI Assistant';
    if (path.startsWith('/settings')) return 'Settings';
    return 'Workspace';
  };

  const userInitials = currentUser?.displayName
    ? currentUser.displayName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (currentUser?.email?.slice(0, 2).toUpperCase() || 'RP');

  const handleSignOut = async () => {
    setProfileDropdownOpen(false);
    try {
      await signOut();
      showToast('Signed out of PaperPilot', 'info');
      navigate('/login');
    } catch (error) {
      console.error('Sign-out error:', error);
      showToast('Error signing out', 'error');
    }
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
              <span>Jump to a page…</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-400 bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 rounded">
              <Command className="w-3 h-3 inline" />
              <span>K</span>
            </div>
          </button>
        </div>

        {/* Right: Profile Menu */}
        <div className="flex items-center gap-3">
          {/* User Profile Menu Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileDropdownOpen((prev) => !prev)}
              aria-label="User profile menu"
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Google User'}
                  className="w-6 h-6 rounded-full object-cover border border-zinc-700"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-accent-600/30 text-accent-300 font-semibold flex items-center justify-center text-[10px] border border-accent-500/40">
                  {userInitials}
                </div>
              )}
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-750 rounded-xl shadow-2xl p-1.5 text-xs z-50 animate-in zoom-in-95 duration-100">
                {/* Authenticated User Header */}
                <div className="p-2.5 border-b border-zinc-800">
                  <div className="flex items-center gap-2.5 mb-2">
                    {currentUser?.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt={currentUser.displayName || 'User'}
                        className="w-9 h-9 rounded-full object-cover border border-zinc-700 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-accent-600/30 text-accent-300 font-semibold flex items-center justify-center text-xs border border-accent-500/40 shrink-0">
                        {userInitials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-zinc-100 truncate" title={currentUser?.displayName || 'Researcher'}>
                        {currentUser?.displayName || 'Researcher'}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono truncate" title={currentUser?.email || undefined}>
                        {currentUser?.email || 'Academic Researcher'}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    Google Account Verified
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
                    <span>Settings</span>
                  </button>
                </div>

                {/* Sign Out Action */}
                <div className="pt-1 border-t border-zinc-800">
                  <button
                    id="header-signout-button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors text-left text-xs font-medium cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Sign out</span>
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
