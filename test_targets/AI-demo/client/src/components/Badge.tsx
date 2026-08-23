import React from 'react';
import { theme } from './theme';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'gray';
  className?: string;
}

const Badge = ({ children, variant = 'primary', className = '' }: BadgeProps) => {
  const styles: Record<string, string> = {
    primary: theme.colors.primary.soft,
    success: theme.colors.success.soft,
    warning: theme.colors.warning.soft,
    error: theme.colors.error.soft,
    gray: "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
