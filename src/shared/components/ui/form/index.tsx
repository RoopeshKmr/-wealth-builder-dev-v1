import type { FormEvent, ReactNode } from 'react';
import { cn } from '@core/utils';

interface FormProps {
  children: ReactNode;
  className?: string;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
}

export function Form({ children, className, onSubmit }: FormProps) {
  return (
    <form onSubmit={onSubmit} className={cn('grid gap-4', className)}>
      {children}
    </form>
  );
}

interface FormRowGroupProps {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3;
}

const groupColumns: Record<1 | 2 | 3, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-3',
};

export function FormRowGroup({ children, className, columns = 2 }: FormRowGroupProps) {
  return <div className={cn('grid gap-4', groupColumns[columns], className)}>{children}</div>;
}

interface FormRowProps {
  children: ReactNode;
  className?: string;
}

export function FormRow({ children, className }: FormRowProps) {
  return <div className={cn('grid gap-1.5', className)}>{children}</div>;
}

interface FormActionsProps {
  children: ReactNode;
  className?: string;
}

export function FormActions({ children, className }: FormActionsProps) {
  return (
    <div className={cn('mt-2 flex justify-end gap-3 border-t border-white/10 pt-4', className)}>
      {children}
    </div>
  );
}
