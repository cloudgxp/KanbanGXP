import React from 'react';
import { cn } from '../lib/utils';

export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  size?: number | string;
  className?: string;
  variant?: 'rounded' | 'outlined' | 'sharp';
  filled?: boolean;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  grade?: -25 | 0 | 200;
  opticalSize?: 20 | 24 | 40 | 48;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  className,
  variant = 'rounded',
  filled = false,
  weight = 400,
  grade = 0,
  opticalSize = 24,
  style,
  ...props
}) => {
  const fontVariationSettings = `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`;
  const fontClass = variant === 'rounded' 
    ? 'material-symbols-rounded' 
    : variant === 'sharp' 
      ? 'material-symbols-sharp' 
      : 'material-symbols-outlined';

  return (
    <span
      className={cn(fontClass, "select-none inline-flex items-center justify-center leading-none shrink-0", className)}
      style={{
        fontSize: typeof size === 'number' ? `${size}px` : size,
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
        fontVariationSettings,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  );
};

export default Icon;
