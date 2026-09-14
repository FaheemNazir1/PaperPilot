import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'subtle' | 'interactive';
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-zinc-900/70 border border-zinc-800/80 shadow-xs backdrop-blur-xs',
    subtle: 'bg-zinc-900/30 border border-zinc-800/50',
    interactive: 'bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700/90 hover:bg-zinc-900/90 transition-all duration-150 cursor-pointer'
  };

  return (
    <div
      className={cn(
        'rounded-xl p-5 text-zinc-100',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
