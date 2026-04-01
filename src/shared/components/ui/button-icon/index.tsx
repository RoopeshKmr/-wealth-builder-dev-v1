import type { ReactNode } from 'react';
import { Button, type ButtonProps } from '../button';

export interface ButtonIconProps extends Omit<ButtonProps, 'children' | 'size'> {
  icon: ReactNode;
  ariaLabel: string;
  size?: 'sm' | 'default' | 'lg';
}

const sizeClassMap: Record<NonNullable<ButtonIconProps['size']>, string> = {
  sm: 'h-8 w-8',
  default: 'h-9 w-9',
  lg: 'h-10 w-10',
};

export function ButtonIcon({
  icon,
  ariaLabel,
  className,
  variant = 'outline',
  size = 'default',
  type = 'button',
  ...props
}: ButtonIconProps) {
  return (
    <Button
      type={type}
      variant={variant}
      size="icon"
      className={[
        'flex items-center justify-center p-0 leading-none',
        sizeClassMap[size],
        className || '',
      ]
        .join(' ')
        .trim()}
      aria-label={ariaLabel}
      {...props}
    >
      <span className="inline-flex items-center justify-center leading-none">{icon}</span>
    </Button>
  );
}
