import * as React from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { buttonVariants } from '@/components/ui/button';

// ============================================
// ACTION BUTTON
// A common "call-to-action" button used across the admin.
// Wraps shadcn Button with loading state, icon support,
// and consistent full-width mobile styling.
// ============================================

export interface ActionButtonProps
  extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  /** Show a loading spinner and disable the button */
  loading?: boolean;
  /** Icon component to render before the label */
  icon?: React.ComponentType<{ className?: string }>;
  /** Use Slot pattern for asChild rendering */
  asChild?: boolean;
  /** When true, button spans full width (default: true) */
  fullWidth?: boolean;
}

function ActionButton({
  className,
  children,
  loading = false,
  icon: Icon,
  disabled,
  variant = 'default',
  size = 'lg',
  fullWidth = true,
  ...props
}: ActionButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || loading}
      className={cn(
        'relative rounded-xl font-semibold gap-2 h-11 text-sm',
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : Icon ? (
        <Icon className="h-4 w-4" />
      ) : null}
      {children}
    </Button>
  );
}

export { ActionButton };
