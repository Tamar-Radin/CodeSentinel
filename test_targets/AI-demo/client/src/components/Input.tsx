import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ComponentType<{ size?: number }>;
}

const Input = ({ label, error, icon: Icon, id: externalId, ...props }: InputProps) => {
  const autoId = useId();
  const inputId = externalId || autoId;

  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            <Icon size={20} />
          </div>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`
            block w-full rounded-md border shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all
            ${Icon ? 'pr-10' : ''}
            ${error
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 text-gray-900 focus:border-blue-500'
            }
            disabled:bg-gray-50 disabled:text-gray-500
          `}
          {...props}
        />
      </div>
      {error && <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600" role="alert">{error}</p>}
    </div>
  );
};

export default Input;
