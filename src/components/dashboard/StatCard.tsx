import React from 'react';
import { Card } from '../common/Card';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  sublabel,
  icon: Icon,
  trend
}) => {
  return (
    <Card className="relative overflow-hidden p-5 bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/60 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-300 tracking-wide uppercase">
            {label}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tracking-tight text-white">
              {value}
            </span>
            {trend && (
              <span className="text-[11px] font-mono text-zinc-300 font-medium">
                {trend}
              </span>
            )}
          </div>
          {sublabel && (
            <p className="text-xs text-zinc-300 mt-1">
              {sublabel}
            </p>
          )}
        </div>
        <div className="p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/40 text-zinc-300">
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </Card>
  );
};
