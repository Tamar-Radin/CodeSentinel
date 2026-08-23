import React from 'react';
import { theme } from './theme';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  type?: 'button' | 'submit' | 'reset';
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  children?: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

const Button = ({ variant = 'primary', size = 'md', type = 'button', icon: Icon, children, disabled, onClick, className = '' }: ButtonProps) => {
  const baseStyle = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500";

  const variants: Record<string, string> = {
    primary: theme.colors.primary.solid,
    secondary: theme.colors.secondary.solid,
    success: theme.colors.success.solid,
    error: theme.colors.error.solid,
    ghost: theme.colors.ghost,
    outline: theme.colors.outline,
  };

  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
    icon: "p-2",
  };

  const style = disabled ? theme.colors.disabled : (variants[variant] || variants.primary);

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyle} ${style} ${sizes[size]} ${className}`}
    >
      {Icon && <Icon size={size === 'sm' ? 16 : 20} className={children ? "ml-2" : ""} />}
      {children}
    </button>
  );
};

export default Button;
