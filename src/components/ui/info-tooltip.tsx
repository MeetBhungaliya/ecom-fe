import * as React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Info } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface InfoTooltipProps {
  /** Text or React nodes to render inside the tooltip popup */
  content: React.ReactNode;
  /** Custom trigger element; if not provided, defaults to an Info/Help icon */
  children?: React.ReactNode;
  /** Icon type when children is not provided: 'info' (default) or 'help' */
  iconVariant?: 'info' | 'help';
  /** Size styling for default icon */
  iconClassName?: string;
  /** Content container styling */
  contentClassName?: string;
  /** Radix side placement */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Radix alignment */
  align?: 'start' | 'center' | 'end';
  /** Offset distance from trigger */
  sideOffset?: number;
  /** Delay before opening tooltip in ms */
  delayDuration?: number;
  /** Optional trigger wrapper className */
  className?: string;
  /** Whether the trigger should have a dashed underline indicator (e.g. for numbers or terms) */
  underline?: boolean;
}

/**
 * Common reusable InfoTooltip component built on top of shadcn/ui Tooltip.
 * Fully supports dark and light themes with theme-aware borders, backgrounds, and text.
 * Can wrap custom triggers (like numbers, labels, badges) or render a clean info/help icon.
 */
export function InfoTooltip({
  content,
  children,
  className,
  iconVariant = 'info',
  iconClassName,
  contentClassName,
  side = 'top',
  align = 'center',
  sideOffset = 4,
  delayDuration = 100,
  underline = false,
}: InfoTooltipProps) {
  const IconComponent = iconVariant === 'help' ? HelpCircle : Info;

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children ? (
            <span
              tabIndex={0}
              className={cn(
                'cursor-help outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm',
                underline &&
                  'border-b border-dashed border-muted-foreground/40 hover:border-foreground/70 transition-colors',
                className,
              )}
            >
              {children}
            </span>
          ) : (
            <button
              type="button"
              tabIndex={0}
              className="inline-flex items-center justify-center text-muted-foreground/70 transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-help rounded-full p-0.5"
              aria-label="More information"
            >
              <IconComponent className={cn('h-3.5 w-3.5', iconClassName)} />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          sideOffset={sideOffset}
          className={contentClassName}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
