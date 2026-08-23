import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Monitor, Loader2 } from 'lucide-react';
import { login, saveSession } from '../services/authService';
import type { LoginRequest } from '@architect/shared';
import Alert from '../components/Alert';
import Button from '../components/Button';

const LoginPage = () => {
  const [form, setForm] = useState<LoginRequest>({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      setError('נא למלא את כל השדות');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('כתובת אימייל לא תקינה');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await login(form);
      saveSession(data);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'אימייל או סיסמה שגויים');
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = isLoading || !form.email || !form.password;

  return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">

        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <Monitor size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">TechStore</h1>
          <p className="text-gray-500 mt-1 text-sm">מערכת ניהול</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow border border-gray-100 px-8 py-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">כניסה לחשבון</h2>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                כתובת אימייל
              </label>
              <input
                id="login-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="example@mail.com"
                disabled={isLoading}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'login-error' : undefined}
                className={`
                  block w-full rounded-md border shadow-sm py-2 px-3
                  focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all
                  disabled:bg-gray-50 disabled:text-gray-500
                  ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}
                `}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                סיסמה
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="הכנס סיסמה"
                  disabled={isLoading}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? 'login-error' : undefined}
                  className={`
                    block w-full rounded-md border shadow-sm py-2 px-3 pl-10
                    focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all
                    disabled:bg-gray-50 disabled:text-gray-500
                    ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div id="login-error">
                <Alert type="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              disabled={isDisabled}
              className="w-full text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="ml-2 animate-spin" />
                  מתחבר...
                </>
              ) : (
                'כניסה'
              )}
            </Button>

          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          TechStore © {new Date().getFullYear()} · כל הזכויות שמורות
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
