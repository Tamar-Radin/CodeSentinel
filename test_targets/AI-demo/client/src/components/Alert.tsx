import React from 'react';
import { Info, AlertTriangle, X, XCircle, CheckCircle } from 'lucide-react';
import { theme } from './theme';

interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
}

const Alert = ({ type = 'info', title, children, onClose }: AlertProps) => {
  const styles: Record<string, string> = {
    info: theme.colors.info.alert,
    success: theme.colors.success.alert,
    warning: theme.colors.warning.alert,
    error: theme.colors.error.alert,
  };

  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: XCircle,
  };

  const Icon = icons[type];

  return (
    <div role="alert" className={`rounded-md p-4 border ${styles[type]} mb-4 relative`}>
      <div className="flex">
        <div className="flex-shrink-0 ml-3">
          <Icon size={20} />
        </div>
        <div className="flex-1 md:flex md:justify-between">
          <div>
            {title && <h3 className="text-sm font-medium">{title}</h3>}
            <div className={`text-sm ${title ? 'mt-2' : ''}`}>
              {children}
            </div>
          </div>
        </div>
        {onClose && (
          <div className="mr-auto pl-3">
            <button onClick={onClose} aria-label="סגור" className="inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 opacity-60 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert;
