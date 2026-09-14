import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Upload,
  BookOpen,
  GitCompare,
  Lightbulb,
  Bot,
  Settings,
  FolderKanban,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile?: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse
}) => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, badge: null },
    { name: 'My Papers', path: '/papers', icon: FileText, badge: '12' },
    { name: 'Upload Papers', path: '/upload', icon: Upload, badge: null },
    { name: 'Literature Review', path: '/literature-review', icon: BookOpen, badge: '8' },
    { name: 'Compare Papers', path: '/compare', icon: GitCompare, badge: null },
    { name: 'Research Gaps', path: '/research-gaps', icon: Lightbulb, badge: '23' },
    { name: 'AI Assistant', path: '/assistant', icon: Bot, badge: 'Active' },
  ];

  const isActiveRoute = (path: string) => {
    if (path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard')) {
      return true;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-zinc-950 border-r border-zinc-800/80 transition-all duration-200 ease-in-out',
          // Desktop width
          isCollapsed ? 'lg:w-16' : 'lg:w-64',
          // Mobile slide-over
          isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-zinc-800/80">
          <NavLink
            to="/dashboard"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 group overflow-hidden"
          >
            <div className="w-8 h-8 rounded-lg bg-accent-600/20 border border-accent-500/40 flex items-center justify-center text-accent-400 group-hover:bg-accent-600/30 transition-colors shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 transition-opacity duration-150">
                <span className="font-semibold text-zinc-100 tracking-tight text-sm flex items-center gap-1.5 truncate">
                  PaperPilot
                </span>
                <span className="text-[10px] text-zinc-400 block leading-tight font-sans truncate">
                  AI Research Copilot
                </span>
              </div>
            )}
          </NavLink>

          {/* Desktop collapse button */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation items */}
        <div className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto custom-scrollbar">
          {!isCollapsed && (
            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Research Workspace
            </div>
          )}

          {navItems.map((item) => {
            const active = isActiveRoute(item.path);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                title={isCollapsed ? item.name : undefined}
                className={cn(
                  'flex items-center px-2.5 py-2 rounded-lg text-xs font-medium transition-colors group relative',
                  isCollapsed ? 'justify-center' : 'justify-between',
                  active
                    ? 'bg-zinc-850/90 text-zinc-100 border border-zinc-700/60 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/70'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      active ? 'text-accent-400' : 'text-zinc-400 group-hover:text-zinc-300'
                    )}
                  />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </div>

                {!isCollapsed && item.badge && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-mono font-medium shrink-0',
                      active ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-900 text-zinc-400'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}

          {/* Separator */}
          <div className="pt-3 pb-1">
            <div className="h-px bg-zinc-800/80 mx-1 mb-2" />
            {!isCollapsed && (
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                Workspace
              </div>
            )}
          </div>

          {/* Project Switcher Info (Subtle) */}
          {!isCollapsed && (
            <div className="px-2.5 py-2 rounded-lg bg-zinc-900/30 border border-zinc-850 text-xs">
              <div className="flex items-center justify-between text-zinc-400 mb-0.5">
                <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider">
                  <FolderKanban className="w-3 h-3 text-accent-400" />
                  Active Project
                </span>
              </div>
              <div className="text-zinc-200 font-medium text-xs truncate">
                Scientific Literature Synthesis
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                12 papers • 4 domains
              </div>
            </div>
          )}

          {/* Settings */}
          <NavLink
            to="/settings"
            onClick={onCloseMobile}
            title={isCollapsed ? 'Settings' : undefined}
            className={cn(
              'flex items-center px-2.5 py-2 rounded-lg text-xs font-medium transition-colors group mt-1',
              isCollapsed ? 'justify-center' : 'gap-2.5',
              location.pathname === '/settings'
                ? 'bg-zinc-850/90 text-zinc-100 border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/70'
            )}
          >
            <Settings className="w-4 h-4 text-zinc-400 group-hover:text-zinc-300 shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </NavLink>
        </div>

        {/* User profile & backend status at bottom */}
        <div className="p-2.5 border-t border-zinc-800/80 bg-zinc-950/60">
          <div
            className={cn(
              'flex items-center p-2 rounded-lg bg-zinc-900/40 border border-zinc-850',
              isCollapsed ? 'justify-center' : 'justify-between'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-200 shrink-0">
                RP
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-medium text-zinc-200 truncate">
                    Researcher
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    Local Workspace
                  </div>
                </div>
              )}
            </div>
            {!isCollapsed && <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
          </div>
        </div>
      </aside>
    </>
  );
};
