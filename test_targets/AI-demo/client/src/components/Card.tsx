import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

const Card = ({ title, subtitle, children, actions, className = '' }: CardProps) => (
  <div className={`bg-white overflow-hidden shadow rounded-lg border border-gray-100 ${className}`}>
    {(title || actions) && (
      <div className="bg-white px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
        <div>
          {title && <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>}
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-gray-500">{subtitle}</p>}
        </div>
        {actions && <div>{actions}</div>}
      </div>
    )}
    <div className="px-4 py-5 sm:p-6">
      {children}
    </div>
  </div>
);

export default Card;
