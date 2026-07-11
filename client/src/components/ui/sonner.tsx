'use client';

import { cn } from '@/utils/cn';
import {
  Success,
  Warning,
  Close,
  Close2,
  Loading,
} from '@nutui/icons-react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster({ className, style, icons, ...props }: ToasterProps) {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className={cn('toaster group', className)}
      position="top-center"
      icons={{
        success: (
          <Success
            color="currentColor"
            className="size-4 text-success"
          />
        ),
        info: (
          <Warning
            color="currentColor"
            className="size-4 text-info"
          />
        ),
        warning: (
          <Warning
            color="currentColor"
            className="size-4 text-warning"
          />
        ),
        error: (
          <Close
            color="currentColor"
            className="size-4 text-destructive"
          />
        ),
        close: <Close2 className="size-4 text-accent-foreground" />,
        loading: <Loading className="size-4 animate-spin text-primary" />,
        ...icons,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
          ...style,
        }
      }
      {...props}
    />
  );
}

export { Toaster };
