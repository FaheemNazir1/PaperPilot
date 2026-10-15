import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { MAX_UPLOAD_MB } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useLibrary } from '../contexts/LibraryContext';
import { useToast } from '../context/ToastContext';

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-3">
    <dt className="text-sm text-zinc-400">{label}</dt>
    <dd className="text-sm text-zinc-200 break-all sm:text-right">{children}</dd>
  </div>
);

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { currentUser, signOut } = useAuth();
  const { count } = useLibrary();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch {
      showToast('Error signing out', 'error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">Your account and library.</p>
      </div>

      <section aria-labelledby="account-heading" className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-5">
        <h2 id="account-heading" className="sr-only">
          Account
        </h2>
        <dl className="divide-y divide-zinc-800/80">
          <Row label="Name">{currentUser?.displayName || '—'}</Row>
          <Row label="Email">{currentUser?.email || '—'}</Row>
          <Row label="Sign-in method">Google</Row>
        </dl>
      </section>

      <section aria-labelledby="library-heading" className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-5">
        <h2 id="library-heading" className="sr-only">
          Library
        </h2>
        <dl className="divide-y divide-zinc-800/80">
          <Row label="Papers in My Papers">{count ?? '—'}</Row>
          <Row label="Maximum upload size">{MAX_UPLOAD_MB} MB per PDF</Row>
        </dl>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-200">Preferences</h2>
          <Badge variant="outline">Coming soon</Badge>
        </div>
        <p className="text-sm text-zinc-500 mt-2">
          Citation style, appearance and other preferences will appear here once the features that use them are available.
        </p>
      </section>

      <div>
        <Button variant="danger" size="md" leftIcon={<LogOut className="w-4 h-4" />} onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
};
