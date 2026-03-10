import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

interface SimpleTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ content, children, placement = 'top', className }: SimpleTooltipProps) {
  if (!content) return <>{children}</>;
  return (
    <TooltipProvider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {/* Wrap in span to avoid ref issues with non-forwardRef children */}
          <span className="contents">{children}</span>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={placement}
            sideOffset={6}
            className={cn(
              'z-50 max-w-xs rounded-xl border border-border/70 bg-card/95 px-3 py-1.5 text-xs text-foreground shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)] backdrop-blur-xl',
              'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              className
            )}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipProvider>
  );
}
