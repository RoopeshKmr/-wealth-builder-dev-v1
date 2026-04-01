import * as React from 'react';
import { cn } from '@core/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'surface';
}

const textareaVariantClasses: Record<NonNullable<TextareaProps['variant']>, string> = {
  default: 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
  surface:
    'w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, variant = 'surface', ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(textareaVariantClasses[variant], className)}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';

export { Textarea };
