---
description: 'agent that create component by the design system page'
tools: ['vscode', 'execute', 'read', 'edit', 'search', 'web', 'agent', 'todo']
---
# Design Agent 
This agent is designed to create components based on the design system page. It can read the design specifications, search for relevant resources, and execute tasks to build the components in VS Code. The agent will also create a todo list of tasks to ensure that all necessary steps are completed for the component creation process.

## tech stack
- React
- TypeScript
- Tailwind CSS
- Lucide icons

## Workflow
1. The agent will read the design specifications from the design system page.
2. It will search for relevant resources and documentation to understand the design requirements.
3. The agent will create a todo list of tasks that need to be completed to build the component.
4. It will execute tasks in VS Code to create the component based on the design specifications.
5. The agent will continuously update the todo list and execute tasks until the component is fully implemented according to the design specifications.

## The Design System Page

```jsx
import React, { useState } from 'react';
import { 
  Check, X, AlertTriangle, Info, Search, Bell, Menu, 
  ChevronRight, ChevronDown, User, Settings, Home, 
  ShoppingCart, Package, Users, BarChart2, Edit, Trash2,
  Eye, Monitor, Cpu, Plus, XCircle, CheckCircle, Loader2
} from 'lucide-react';

/* ===================================================================
  🎨 יסודות (Foundations)
  ===================================================================
*/

// פלטת צבעים לשימוש במערכת (Tailwind Classes reference)
const colors = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  secondary: "bg-gray-800 hover:bg-gray-900 text-white",
  success: "bg-green-500 text-white",
  error: "bg-red-500 text-white",
  warning: "bg-yellow-500 text-white",
  info: "bg-cyan-500 text-white",
  ghost: "bg-transparent hover:bg-gray-100 text-gray-700",
  outline: "bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50",
  disabled: "bg-gray-200 text-gray-400 cursor-not-allowed",
};

/* ===================================================================
  🧩 רכיבי בסיס (Core Components)
  ===================================================================
*/

// --- Button ---
const Button = ({ variant = 'primary', size = 'md', icon: Icon, children, disabled, onClick, className = '' }) => {
  const baseStyle = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500";
  
  const variants = {
    primary: colors.primary,
    secondary: colors.secondary,
    success: colors.success,
    error: colors.error,
    ghost: colors.ghost,
    outline: colors.outline,
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
    icon: "p-2",
  };

  const style = disabled ? colors.disabled : (variants[variant] || variants.primary);

  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyle} ${style} ${sizes[size]} ${className}`}
    >
      {Icon && <Icon size={size === 'sm' ? 16 : 20} className={children ? "ml-2" : ""} />}
      {children}
    </button>
  );
};

// --- Input ---
const Input = ({ label, error, icon: Icon, ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            <Icon size={20} />
          </div>
        )}
        <input
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
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

// --- Checkbox ---
const Checkbox = ({ label, checked, onChange }) => (
  <label className="inline-flex items-center cursor-pointer group">
    <div className="relative flex items-center">
      <input 
        type="checkbox" 
        className="peer sr-only" 
        checked={checked} 
        onChange={e => onChange(e.target.checked)} 
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

// --- Toggle / Switch ---
const Toggle = ({ checked, onChange, label }) => (
  <label className="inline-flex items-center cursor-pointer">
    <div className="relative">
      <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
      <div className={`w-11 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
      <div className={`
        absolute top-0.5 right-0.5 left-auto bg-white border border-gray-200 rounded-full h-5 w-5 transition-transform transform
        ${checked ? '-translate-x-5' : 'translate-x-0'}
      `}></div>
    </div>
    {label && <span className="mr-3 text-sm font-medium text-gray-700">{label}</span>}
  </label>
);

// --- Select ---
const Select = ({ label, options, value, onChange, error }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
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
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

/* ===================================================================
  🧭 ניווט וחיווי (Navigation & Feedback)
  ===================================================================
*/

// --- Badge ---
const Badge = ({ children, variant = 'primary', className = '' }) => {
  const styles = {
    primary: "bg-blue-100 text-blue-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
    gray: "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};

// --- Alert ---
const Alert = ({ type = 'info', title, children, onClose }) => {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    success: "bg-green-50 border-green-200 text-green-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    error: "bg-red-50 border-red-200 text-red-800",
  };
  
  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: XCircle,
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 border ${styles[type]} mb-4 relative`}>
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
            <button onClick={onClose} className="inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 opacity-60 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Modal ---
const Modal = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} aria-hidden="true"></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:mr-4 sm:text-right w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  {title}
                </h3>
                <div className="mt-2">
                  {children}
                </div>
              </div>
            </div>
          </div>
          {footer && (
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Breadcrumbs ---
const Breadcrumbs = ({ items }) => (
  <nav className="flex" aria-label="Breadcrumb">
    <ol className="flex items-center space-x-2 space-x-reverse">
      {items.map((item, index) => (
        <li key={index} className="flex items-center">
          {index > 0 && <ChevronRight size={16} className="text-gray-400 mx-2 rotate-180" />}
          {item.href ? (
            <a href={item.href} className="text-sm font-medium text-gray-500 hover:text-gray-700">
              {item.label}
            </a>
          ) : (
            <span className="text-sm font-medium text-gray-900">{item.label}</span>
          )}
        </li>
      ))}
    </ol>
  </nav>
);

/* ===================================================================
  📊 תצוגת נתונים (Data Display)
  ===================================================================
*/

// --- Card ---
const Card = ({ title, subtitle, children, actions, className = '' }) => (
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

// --- Table ---
const Table = ({ columns, data, actions }) => (
  <div className="flex flex-col w-full">
    <div className="overflow-x-auto">
      <div className="align-middle inline-block min-w-full">
        <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {col.header}
                  </th>
                ))}
                {actions && <th scope="col" className="relative px-6 py-3"><span className="sr-only">פעולות</span></th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-gray-50">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {col.render ? col.render(row[col.accessor], row) : row[col.accessor]}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);

// --- Avatar ---
const Avatar = ({ src, alt, fallback, size = 'md' }) => {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-base",
  };
  
  return (
    <div className={`${sizes[size]} rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-300 text-gray-600 font-bold`}>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span>{fallback || <User />}</span>
      )}
    </div>
  );
};

/* ===================================================================
  📱 אפליקציית דמו (Showcase)
  ===================================================================
  זהו קוד המדגים את כל הרכיבים בפעולה.
*/

export default function DesignSystemShowcase() {
  const [activeTab, setActiveTab] = useState('foundations');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toggleVal, setToggleVal] = useState(false);
  
  // נתוני דמו לטבלה
  const products = [
    { id: 1, name: 'מחשב נייד Dell XPS', category: 'מחשבים ניידים', price: 5490, stock: 12, status: 'in_stock' },
    { id: 2, name: 'כרטיס מסך RTX 4070', category: 'חומרה', price: 3200, stock: 0, status: 'out_of_stock' },
    { id: 3, name: 'מקלדת מכנית Logitech', category: 'ציוד היקפי', price: 450, stock: 5, status: 'low_stock' },
  ];

  const renderContent = () => {
    switch(activeTab) {
      case 'foundations':
        return (
          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">פלטת צבעים</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(colors).filter(([key]) => !['ghost', 'outline', 'disabled'].includes(key)).map(([name, cls]) => (
                  <div key={name} className="flex flex-col rounded-lg overflow-hidden shadow-sm">
                    <div className={`h-24 ${cls} flex items-center justify-center`}></div>
                    <div className="p-3 bg-white">
                      <p className="font-bold capitalize text-gray-700">{name}</p>
                      <p className="text-xs text-gray-500">{cls.split(' ')[0]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">טיפוגרפיה</h2>
              <div className="bg-white p-6 rounded-lg shadow space-y-4 overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-baseline gap-2">
                  <span className="w-24 text-gray-400 text-sm">H1 / 32px</span>
                  <h1 className="text-4xl font-bold text-gray-900 break-words">כותרת ראשית גדולה</h1>
                </div>
                <div className="flex flex-col md:flex-row md:items-baseline gap-2">
                  <span className="w-24 text-gray-400 text-sm">H2 / 24px</span>
                  <h2 className="text-3xl font-bold text-gray-900 break-words">כותרת משנה</h2>
                </div>
                <div className="flex flex-col md:flex-row md:items-baseline gap-2">
                  <span className="w-24 text-gray-400 text-sm">H3 / 20px</span>
                  <h3 className="text-2xl font-bold text-gray-900 break-words">כותרת מדור</h3>
                </div>
                <div className="flex flex-col md:flex-row md:items-baseline gap-2">
                  <span className="w-24 text-gray-400 text-sm">Body</span>
                  <p className="text-base text-gray-600">
                    זהו טקסט רגיל (Body text) המשמש לתוכן הכללי באתר. הוא קריא, נקי ומרווח בצורה נכונה לקריאה נוחה של פסקאות ארוכות.
                  </p>
                </div>
                <div className="flex flex-col md:flex-row md:items-baseline gap-2">
                  <span className="w-24 text-gray-400 text-sm">Caption</span>
                  <p className="text-sm text-gray-500">טקסט קטן המשמש להערות או תיאורים משניים.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">אייקונים (Lucide React)</h2>
              <div className="bg-white p-6 rounded-lg shadow grid grid-cols-3 md:grid-cols-6 gap-6 text-gray-600">
                <div className="flex flex-col items-center gap-2"><Home size={24}/><span className="text-xs">Home</span></div>
                <div className="flex flex-col items-center gap-2"><User size={24}/><span className="text-xs">User</span></div>
                <div className="flex flex-col items-center gap-2"><Settings size={24}/><span className="text-xs">Settings</span></div>
                <div className="flex flex-col items-center gap-2"><ShoppingCart size={24}/><span className="text-xs">Cart</span></div>
                <div className="flex flex-col items-center gap-2"><Monitor size={24}/><span className="text-xs">Monitor</span></div>
                <div className="flex flex-col items-center gap-2"><Cpu size={24}/><span className="text-xs">Cpu</span></div>
              </div>
            </section>
          </div>
        );
      
      case 'components':
        return (
          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">כפתורים (Buttons)</h2>
              <div className="bg-white p-6 rounded-lg shadow space-y-6">
                <div className="flex flex-wrap gap-4 items-center">
                  <Button>Primary Button</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="error">Destructive</Button>
                  <Button disabled>Disabled</Button>
                </div>
                <div className="flex flex-wrap gap-4 items-center border-t pt-4">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                  <Button variant="primary" size="icon" icon={Plus} />
                  <Button variant="primary" icon={ShoppingCart}>הוסף לסל</Button>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">טפסים (Forms)</h2>
              <div className="bg-white p-6 rounded-lg shadow grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="שם לקוח" placeholder="הכנס שם מלא" />
                <Input label="אימייל" placeholder="example@mail.com" icon={User} />
                <Input label="שדה עם שגיאה" value="ערך לא תקין" error="נא להזין ערך תקין" />
                <Select 
                  label="סטטוס הזמנה" 
                  options={[
                    {label: 'חדש', value: 'new'},
                    {label: 'בטיפול', value: 'processing'},
                    {label: 'נשלח', value: 'shipped'}
                  ]} 
                />
                <div className="col-span-1 md:col-span-2 flex gap-8 items-center pt-2">
                  <Checkbox label="זכור אותי במחשב זה" checked={true} onChange={() => {}} />
                  <Toggle label="מצב כהה" checked={toggleVal} onChange={setToggleVal} />
                </div>
              </div>
            </section>
          </div>
        );

      case 'feedback':
        return (
          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">הודעות (Alerts)</h2>
              <div className="bg-white p-6 rounded-lg shadow space-y-4">
                <Alert type="info" title="מידע חשוב">מערכת הניהול תעבור תחזוקה הלילה.</Alert>
                <Alert type="success" title="הפעולה בוצעה">הלקוח נוסף בהצלחה למאגר.</Alert>
                <Alert type="warning" title="שים לב">המלאי למוצר זה נמוך.</Alert>
                <Alert type="error" title="שגיאה">לא ניתן להתחבר לשרת כרגע.</Alert>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">מודאל (Modal)</h2>
              <div className="bg-white p-6 rounded-lg shadow">
                <Button onClick={() => setIsModalOpen(true)}>פתח מודאל הדגמה</Button>
                
                <Modal 
                  isOpen={isModalOpen} 
                  onClose={() => setIsModalOpen(false)}
                  title="אישור מחיקת מוצר"
                  footer={
                    <>
                      <Button variant="error" onClick={() => setIsModalOpen(false)}>מחק לצמיתות</Button>
                      <Button variant="outline" onClick={() => setIsModalOpen(false)}>ביטול</Button>
                    </>
                  }
                >
                  <p className="text-sm text-gray-500">
                    האם אתה בטוח שברצונך למחוק את המוצר? פעולה זו אינה הפיכה וכל הנתונים יאבדו.
                  </p>
                </Modal>
              </div>
            </section>
            
             <section>
              <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">תגיות (Badges)</h2>
              <div className="bg-white p-6 rounded-lg shadow flex flex-wrap gap-4">
                <Badge variant="primary">חדש</Badge>
                <Badge variant="success">פעיל</Badge>
                <Badge variant="warning">בטיפול</Badge>
                <Badge variant="error">מבוטל</Badge>
                <Badge variant="gray">טיוטה</Badge>
              </div>
            </section>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">כרטיסים (Cards)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="סה״כ מכירות" subtitle="חודש נוכחי">
                  <div className="text-3xl font-bold text-gray-900">₪45,231</div>
                  <div className="text-sm text-green-600 flex items-center mt-2">
                    <CheckCircle size={14} className="ml-1"/> עלייה של 12%
                  </div>
                </Card>
                <Card title="לקוחות חדשים">
                  <div className="flex items-center space-x-2 space-x-reverse mb-4">
                    <Avatar fallback="אב" size="sm" />
                    <Avatar fallback="דכ" size="sm" />
                    <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" size="sm" />
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500">+12</div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">צפה בכולם</Button>
                </Card>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">טבלה (Table)</h2>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <Table 
                  columns={[
                    { header: 'שם מוצר', accessor: 'name' },
                    { header: 'קטגוריה', accessor: 'category' },
                    { header: 'מחיר', accessor: 'price', render: (val) => `₪${val}` },
                    { 
                      header: 'סטטוס', 
                      accessor: 'status',
                      render: (status) => {
                        const map = { in_stock: 'success', low_stock: 'warning', out_of_stock: 'error' };
                        const label = { in_stock: 'במלאי', low_stock: 'מלאי נמוך', out_of_stock: 'חסר' };
                        return <Badge variant={map[status]}>{label[status]}</Badge>
                      }
                    }
                  ]}
                  data={products}
                  actions={(row) => (
                    <div className="flex gap-2 justify-end">
                      <button className="text-blue-600 hover:text-blue-900"><Edit size={16}/></button>
                      <button className="text-red-600 hover:text-red-900"><Trash2 size={16}/></button>
                    </div>
                  )}
                />
              </div>
            </section>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-right overflow-x-hidden" dir="rtl">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 right-0 w-64 bg-gray-900 text-white overflow-y-auto z-50 
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0
      `}>
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Monitor size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider">TechStore</h1>
              <p className="text-xs text-gray-400">Design System v1.0</p>
            </div>
          </div>
          <button 
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {[
            { id: 'foundations', label: 'יסודות', icon: Package },
            { id: 'components', label: 'רכיבים וטפסים', icon: Check },
            { id: 'feedback', label: 'ניווט והודעות', icon: Bell },
            { id: 'data', label: 'תצוגת נתונים', icon: BarChart2 },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="md:mr-64 p-4 md:p-8 transition-all duration-300">
        <header className="mb-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
             {/* Mobile Menu Button */}
             <button 
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            
            <div>
              <Breadcrumbs items={[
                { label: 'ראשי', href: '#' }, 
                { label: 'Design System' }, 
                { label: activeTab.charAt(0).toUpperCase() + activeTab.slice(1) }
              ]} />
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">
                {activeTab === 'foundations' && 'יסודות המערכת'}
                {activeTab === 'components' && 'רכיבים וטפסים'}
                {activeTab === 'feedback' && 'ניווט והודעות'}
                {activeTab === 'data' && 'תצוגת נתונים'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <Avatar fallback="TS" />
          </div>
        </header>

        <main className="max-w-6xl w-full">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
```