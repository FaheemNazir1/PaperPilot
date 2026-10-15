import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Wrench, LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { Badge } from './Badge';

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  /** 'maintenance' for a feature that existed or is being rebuilt; 'soon' for one not started. */
  state?: 'maintenance' | 'soon';
  headline: string;
  description: string;
  note?: string;
  plannedTitle?: string;
  planned?: string[];
}

/**
 * Honest placeholder for features that are not implemented yet.
 * Renders no controls that pretend to work.
 */
export const ComingSoon: React.FC<ComingSoonProps> = ({
  icon: Icon,
  title,
  state = 'soon',
  headline,
  description,
  note,
  plannedTitle = 'Planned',
  planned = [],
}) => {
  const navigate = useNavigate();
  const StatusIcon = state === 'maintenance' ? Wrench : Clock;

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-14 animate-in fade-in duration-200">
      <div className="text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <Icon className="w-6 h-6 text-accent-400" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">{title}</h1>
          <Badge variant="warning" size="md">
            <StatusIcon className="w-3.5 h-3.5" aria-hidden="true" />
            {headline}
          </Badge>
        </div>

        <p className="text-sm text-zinc-400 leading-relaxed max-w-lg mx-auto">{description}</p>
        {note && <p className="text-sm text-zinc-500 leading-relaxed max-w-lg mx-auto">{note}</p>}
      </div>

      {planned.length > 0 && (
        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-zinc-300">{plannedTitle}</h2>
            <Badge variant="neutral">Planned</Badge>
          </div>
          <ul className="space-y-2">
            {planned.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-400">
                <span className="mt-2 w-1 h-1 rounded-full bg-zinc-600 shrink-0" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <Button
          variant="outline"
          size="md"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/papers')}
        >
          Back to My Papers
        </Button>
      </div>
    </div>
  );
};
