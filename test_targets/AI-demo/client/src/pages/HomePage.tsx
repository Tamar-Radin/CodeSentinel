import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Monitor,
  LogOut,
  ChevronDown,
  ShoppingCart,
  Users,
  BarChart2,
  Package,
  User,
} from 'lucide-react';
import { logout, getSession } from '../services/authService';
import { getInitials, getRoleLabel } from '../services/userService';
import type { UserInfo } from '../services/userService';
import { getStats } from '../services/dashboardService';
import type { DashboardStats } from '@architect/shared';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import Card from '../components/Card';
import Button from '../components/Button';
import Alert from '../components/Alert';

/* ─── Stat card template (icons + colors only; values injected at render) ─── */
const STAT_TEMPLATE = [
  { icon: ShoppingCart, label: 'הזמנות היום', bg: 'bg-blue-100', fg: 'text-blue-600' },
  { icon: Users, label: 'לקוחות פעילים', bg: 'bg-green-100', fg: 'text-green-600' },
  { icon: Package, label: 'מוצרים במלאי', bg: 'bg-yellow-100', fg: 'text-yellow-600' },
  { icon: BarChart2, label: 'סך הכנסות', bg: 'bg-purple-100', fg: 'text-purple-600' },
];

/* ─── Feature cards (static) ─── */
const FEATURE_CARDS = [
  { icon: Package, title: 'ניהול מלאי', desc: 'עקוב אחרי מוצרים וכמויות בזמן אמת' },
  { icon: Users, title: 'ניהול לקוחות', desc: 'נהל פרטי לקוחות והיסטוריית הזמנות' },
  { icon: BarChart2, title: 'דוחות ונתונים', desc: 'קבל תמונת מצב מקיפה על הביצועים' },
];

/* ─── Quick actions (static) ─── */
const QUICK_ACTIONS: Array<{
  icon: typeof Package;
  label: string;
  to?: string;
  adminOnly?: boolean;
}> = [
  { icon: Package, label: 'הוסף מוצר', to: '/products/new', adminOnly: true },
  { icon: Users, label: 'לקוח חדש' },
  { icon: ShoppingCart, label: 'הזמנה חדשה' },
  { icon: BarChart2, label: 'הפק דוח' },
];

/* ================================================================
   HomePage
   ================================================================ */
const HomePage = () => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  /* Load session on mount */
  useEffect(() => {
    const session = getSession();
    if (session) setUser(session);
  }, []);

  /* טעינת סטטיסטיקות הדשבורד מהשרת */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setStatsLoading(true);
    setStatsError(null);
    getStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'שגיאה בטעינת הסטטיסטיקות';
          setStatsError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  /* Close dropdown on outside click */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    navigate('/login');
  };

  /* ============================================================
     NOT LOGGED IN — Landing page
     ============================================================ */
  if (!user) {
    return (
      <div
        className="h-screen w-screen overflow-x-hidden bg-gradient-to-br from-[#0f172a] via-[#1e2a4a] to-[#0f172a] flex flex-col"
        dir="rtl"
      >
        {/* Header bar */}
        <header className="flex items-center justify-between px-4 sm:px-8 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg shadow-lg shadow-blue-900/40">
              <Monitor size={22} className="text-white" />
            </div>
            <span className="text-white text-lg sm:text-xl font-bold tracking-wide">TechStore</span>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="border-2 border-blue-500 text-blue-500 bg-white px-4 sm:px-5 py-2 rounded-lg font-semibold text-sm sm:text-base
                       transition-all hover:bg-blue-50 active:scale-95"
          >
            כניסה למערכת
          </button>
        </header>

        {/* Hero — fills remaining space */}
        <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-6 overflow-y-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-blue-500 rounded-2xl shadow-2xl shadow-blue-900/60 mb-6">
            <Monitor size={32} className="text-white sm:hidden" />
            <Monitor size={40} className="text-white hidden sm:block" />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight">
            ברוכים הבאים ל-TechStore
          </h1>
          <p className="text-gray-300 text-base sm:text-lg max-w-xl mb-8 px-2">
            מערכת ניהול חכמה למוצרי טכנולוגיה. נהל מלאי, לקוחות והזמנות ממקום אחד.
          </p>

          <button
            onClick={() => navigate('/login')}
            className="border-2 border-blue-500 text-blue-500 bg-white px-8 sm:px-10 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-bold
                       transition-all hover:bg-blue-50 hover:scale-105 active:scale-95
                       shadow-lg shadow-blue-900/30"
          >
            התחבר למערכת
          </button>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 sm:mt-14 w-full max-w-3xl px-2">
            {FEATURE_CARDS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white/10 backdrop-blur rounded-xl p-5 text-center border border-white/20
                           hover:bg-white/15 transition-colors"
              >
                <Icon size={28} className="text-blue-400 mx-auto mb-2" />
                <h3 className="text-white font-semibold mb-1 text-sm sm:text-base">{title}</h3>
                <p className="text-gray-400 text-xs sm:text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </main>

        <footer className="text-center py-3 text-gray-600 text-xs shrink-0">
          TechStore © {new Date().getFullYear()} · כל הזכויות שמורות
        </footer>
      </div>
    );
  }

  /* ============================================================
     LOGGED IN — Dashboard home
     ============================================================ */
  return (
    <div className="h-screen w-screen overflow-x-hidden bg-gray-50 flex flex-col" dir="rtl">
      {/* ── Top Header ── */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-sm shrink-0 z-40">
        {/* Right: Logo */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg shadow">
            <Monitor size={22} className="text-white" />
          </div>
          <div>
            <span className="text-gray-900 text-lg font-bold">TechStore</span>
            <span className="text-gray-400 text-xs block leading-none mt-0.5">מערכת ניהול</span>
          </div>
        </div>

        {/* Left: User avatar + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            aria-expanded={dropdownOpen}
            aria-haspopup="menu"
            aria-controls="user-menu"
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 rounded-xl px-3 py-2 transition-colors"
          >
            <Avatar size="sm" fallback={getInitials(user.name)} className="bg-blue-600 text-white border-blue-600 shrink-0" />
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.name}</span>
            <ChevronDown
              size={16}
              className={`text-gray-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown panel */}
          {dropdownOpen && (
            <div id="user-menu" role="menu" className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
              {/* User info */}
              <div className="px-4 py-4 border-b border-gray-100 flex items-center gap-3">
                <Avatar size="md" fallback={getInitials(user.name)} className="bg-blue-600 text-white border-blue-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  <Badge variant="primary" className="mt-1">
                    {getRoleLabel(user.role)}
                  </Badge>
                </div>
              </div>

              {/* Profile row */}
              <button role="menuitem" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <User size={16} className="text-gray-400" />
                הפרופיל שלי
              </button>

              {/* Logout */}
              <div className="border-t border-gray-100">
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  יציאה מהמערכת
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Welcome */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            שלום, {user.name.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1 text-sm">ברוך הבא למערכת הניהול. הנה סקירה קצרה:</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-10">
          {statsLoading ? (
            STAT_TEMPLATE.map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 h-24 rounded-xl" />
            ))
          ) : statsError ? (
            <div className="col-span-2 lg:col-span-4">
              <Alert type="error" title="שגיאה">
                {statsError}
              </Alert>
            </div>
          ) : stats ? (
            STAT_TEMPLATE.map(({ icon: Icon, label, bg, fg }, i) => {
              const value =
                i === 0
                  ? stats.todaysOrders.toLocaleString('he-IL')
                  : i === 1
                  ? stats.totalCustomers.toLocaleString('he-IL')
                  : i === 2
                  ? stats.totalProducts.toLocaleString('he-IL')
                  : `₪${stats.totalRevenue.toLocaleString('he-IL')}`;
              return (
                <div
                  key={label}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
                >
                  <div className={`inline-flex p-2.5 rounded-lg ${bg} mb-3`}>
                    <Icon size={20} className={fg} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-sm text-gray-500 mt-1">{label}</p>
                </div>
              );
            })
          ) : null}
        </div>

        {/* Quick actions */}
        <Card title="פעולות מהירות">
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {QUICK_ACTIONS.map(({ icon: Icon, label, to, adminOnly }) => {
              const allowed = !adminOnly || user?.role === 'admin';
              return (
                <Button
                  key={label}
                  variant="outline"
                  size="sm"
                  icon={Icon}
                  disabled={!allowed || !to}
                  onClick={to && allowed ? () => navigate(to) : undefined}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </Card>
      </div>
      </main>
    </div>
  );
};

export default HomePage;
