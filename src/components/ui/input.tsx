import * as React from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends React.ComponentProps<'input'> {
  label?: string;
  error?: string;
}

function Input({ className, type, label, error, ...props }: InputProps) {
  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    if (type === 'number') {
      (e.target as HTMLElement).blur();
    }
  };

  const inputEl = (
    <input
      type={type}
      data-slot="input"
      onWheel={handleWheel}
      className={cn(
        'h-10 w-full min-w-0 rounded-lg border border-input bg-background/50 px-3 py-2 text-base transition-all outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm shadow-sm hover:border-input/80',
        type === 'number' && '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
        className
      )}
      {...props}
    />
  );

  if (label || error) {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/80 block">
            {label}
          </label>
        )}
        {inputEl}
        {error && (
          <p className="text-xs text-destructive font-medium animate-in fade-in duration-200">
            {error}
          </p>
        )}
      </div>
    );
  }

  return inputEl;
}

export { Input };
