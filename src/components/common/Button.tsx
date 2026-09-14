import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const variantStyles = {
      primary: 'bg-accent-600 hover:bg-accent-500 text-white shadow-sm shadow-accent-950/40 border border-accent-500/40',
      secondary: 'bg-zinc-800 hover:bg-zinc-700/80 text-zinc-100 border border-zinc-700/60 shadow-xs',
      outline: 'bg-transparent hover:bg-zinc-800/60 text-zinc-300 border border-zinc-700/80 hover:text-white',
      ghost: 'bg-transparent hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-100',
      danger: 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50'
    };

    const sizeStyles = {
      sm: 'text-xs px-2.5 py-1.5 gap-1.5 font-normal',
      md: 'text-sm px-3.5 py-2 gap-2',
      lg: 'text-sm px-5 py-2.5 gap-2.5 font-semibold'
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
