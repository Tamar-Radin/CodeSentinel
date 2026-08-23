import { Check } from 'lucide-react';

interface CheckboxProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  'aria-label'?: string;
}

const Checkbox = ({ label, checked, onChange, 'aria-label': ariaLabel }: CheckboxProps) => (
  <label className="inline-flex items-center cursor-pointer group">
    <div className="relative flex items-center">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        aria-label={!label ? ariaLabel : undefined}
      />
      <div className={`
        w-5 h-5 border-2 rounded transition-colors flex items-center justify-center
        ${checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white group-hover:border-blue-400'}
      `}>
        {checked && <Check size={14} className="text-white" />}
      </div>
    </div>
    {label && <span className="mr-2 text-sm text-gray-700 select-none">{label}</span>}
  </label>
);

export default Checkbox;
