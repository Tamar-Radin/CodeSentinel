interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  'aria-label'?: string;
}

const Toggle = ({ checked, onChange, label, 'aria-label': ariaLabel }: ToggleProps) => (
  <label className="inline-flex items-center cursor-pointer">
    <div className="relative">
      <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} aria-label={!label ? ariaLabel : undefined} />
      <div className={`w-11 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
      <div className={`
        absolute top-0.5 left-0.5 bg-white border border-gray-200 rounded-full h-5 w-5 transition-transform transform
        ${checked ? 'translate-x-5' : 'translate-x-0'}
      `}></div>
    </div>
    {label && <span className="mr-3 text-sm font-medium text-gray-700">{label}</span>}
  </label>
);

export default Toggle;
