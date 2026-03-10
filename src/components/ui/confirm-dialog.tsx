import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { BaseButton } from '@/components/base-ui/BaseButton';
import { X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  content?: React.ReactNode;
  okText?: string;
  cancelText?: string;
  onOk?: () => void | Promise<void>;
  onCancel?: () => void;
  centered?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  content,
  okText = 'OK',
  cancelText = 'Cancel',
  onOk,
  onCancel,
}: ConfirmDialogProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleOk = async () => {
    await onOk?.();
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[20px]',
            'border border-border bg-card/95 shadow-[0_32px_80px_-40px_rgba(15,23,42,0.55)] backdrop-blur-xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          <DialogPrimitive.Close
            onClick={handleCancel}
            className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 bg-background/80 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>

          <div className="p-6">
            {title && (
              <DialogPrimitive.Title className="mb-3 pr-8 text-base font-semibold text-foreground">
                {title}
              </DialogPrimitive.Title>
            )}
            {content && (
              <div className="text-sm text-muted-foreground">{content}</div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-border/60 px-6 py-4">
            <BaseButton variant="outline" size="sm" onClick={handleCancel}>
              {cancelText}
            </BaseButton>
            <BaseButton size="sm" onClick={handleOk}>
              {okText}
            </BaseButton>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
