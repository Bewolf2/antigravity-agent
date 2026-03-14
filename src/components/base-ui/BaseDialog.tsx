import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BaseDialogProps {
  open: boolean;
  onCancel: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  width?: number;
  style?: React.CSSProperties;
  className?: string;
}

export function BaseDialog({ open, onCancel, title, children, width, style, className }: BaseDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          style={{
            width: width ? `min(${width}px, calc(100vw - 32px))` : 'min(520px, calc(100vw - 32px))',
            top: style?.top ?? 72,
            left: '50%',
            transform: 'translateX(-50%)',
            ...style,
          }}
          className={cn(
            'fixed z-50 overflow-hidden rounded-[24px] border border-border bg-card/95 shadow-[0_32px_80px_-40px_rgba(15,23,42,0.55)] backdrop-blur-xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            className
          )}
        >
          {title && (
            <div className="px-5 pt-5 pb-0">
              <DialogPrimitive.Title asChild>
                <div className="text-foreground">{title}</div>
              </DialogPrimitive.Title>
            </div>
          )}
          <DialogPrimitive.Close
            onClick={onCancel}
            className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 bg-background/80 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
