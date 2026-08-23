import React, { useState } from 'react';
import { 
  Bell, Menu, Home, ShoppingCart, Package, BarChart2, Edit, Trash2,
  Monitor, Cpu, Plus, CheckCircle
} from 'lucide-react';

import { theme } from './client/src/components/theme';
import Button from './client/src/components/Button';
import Input from './client/src/components/Input';
import Checkbox from './client/src/components/Checkbox';
import Toggle from './client/src/components/Toggle';
import Select from './client/src/components/Select';
import Badge from './client/src/components/Badge';
import Alert from './client/src/components/Alert';
import Modal from './client/src/components/Modal';
import Breadcrumbs from './client/src/components/Breadcrumbs';
import Card from './client/src/components/Card';
import Table from './client/src/components/Table';
import Avatar from './client/src/components/Avatar';

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
                {Object.entries(theme.colors)
                  .filter(([key]) => !['ghost', 'outline', 'disabled'].includes(key))
                  .map(([name, val]) => {
                    const solidCls = typeof val === 'object' ? val.solid : val;
                    return (
                      <div key={name} className="flex flex-col rounded-lg overflow-hidden shadow-sm">
                        <div className={`h-24 ${solidCls} flex items-center justify-center`}></div>
                        <div className="p-3 bg-white">
                          <p className="font-bold capitalize text-gray-700">{name}</p>
                          <p className="text-xs text-gray-500">{solidCls.split(' ')[0]}</p>
                        </div>
                      </div>
                    );
                  })}
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