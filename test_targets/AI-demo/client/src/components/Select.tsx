import { useId } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  id?: string;
}

const Select = ({ label, options, value, onChange, error, id: externalId }: SelectProps) => {
  const autoId = useId();
  const selectId = externalId || autoId;

  return (
    <div className="w-full">
      {label && <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="relative">
        <select
          id={selectId}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${selectId}-error` : undefined}
          className={`
            appearance-none block w-full pl-10 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border
            ${error ? 'border-red-300' : ''}
          `}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="absolute inset-y-0 left-0 flex items-center px-2 pointer-events-none">
          <ChevronDown size={16} className="text-gray-500" />
        </div>
      </div>
      {error && <p id={`${selectId}-error`} className="mt-1 text-sm text-red-600" role="alert">{error}</p>}
    </div>
  );
};

export default Select;
