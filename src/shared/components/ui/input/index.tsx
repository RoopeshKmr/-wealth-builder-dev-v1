import * as React from 'react';
import { cn } from '@core/utils';
import './input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'surface';
}

const inputVariantClasses: Record<NonNullable<InputProps['variant']>, string> = {
  default: '',
  surface: 'h-11 w-full rounded-lg border border-white/20 bg-white/5 px-3 text-white',
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = 'default', ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn('input', inputVariantClasses[variant], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
