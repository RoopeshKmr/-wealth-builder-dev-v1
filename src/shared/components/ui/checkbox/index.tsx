import * as React from 'react';
import { cn } from '@core/utils';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => {
  return <input ref={ref} type="checkbox" className={cn('h-4 w-4 accent-[#ffdd45]', className)} {...props} />;
});

Checkbox.displayName = 'Checkbox';

export { Checkbox };
