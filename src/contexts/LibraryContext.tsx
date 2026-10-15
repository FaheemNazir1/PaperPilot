import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { Paper } from '../types';
import { useAuth } from './AuthContext';

type LibraryStatus = 'loading' | 'ready' | 'error';

interface LibraryContextType {
  /** The signed-in user's own uploads. Never includes demo papers. */
  papers: Paper[];
  /** Number of the user's own papers, or null until it has actually been loaded. */
  count: number | null;
  status: LibraryStatus;
  error: string | null;
  refresh: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

/**
 * Single source of truth for "My Papers". Dashboard, sidebar, header and the
 * papers page all read from here, so their counts can never disagree.
 */
export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid ?? null;

  const [papers, setPapers] = useState<Paper[]>([]);
  const [status, setStatus] = useState<LibraryStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    if (!uid) return;
    const id = ++requestId.current;
    // Only the first load shows a loading state; later refreshes keep the current list and count on screen.
    setStatus((prev) => (prev === 'ready' ? 'ready' : 'loading'));
    setError(null);
    try {
      const list = await api.getPapers(false);
      if (id !== requestId.current) return; // a newer request (or a user switch) superseded this one
      setPapers(list.filter((p) => !p.is_demo));
      setStatus('ready');
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : 'Could not load your papers.');
      setStatus('error');
    }
  }, [uid]);

  useEffect(() => {
    // Drop the previous user's data immediately, then load the new user's.
    requestId.current++;
    setPapers([]);
    setError(null);
    setStatus('loading');
    if (uid) void refresh();
  }, [uid, refresh]);

  const value: LibraryContextType = {
    papers,
    count: status === 'ready' ? papers.length : null,
    status,
    error,
    refresh,
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
};

export const useLibrary = (): LibraryContextType => {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within a LibraryProvider');
  return ctx;
};
