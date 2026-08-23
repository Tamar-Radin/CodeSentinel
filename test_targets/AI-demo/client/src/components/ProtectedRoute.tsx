import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { fetchMe, saveSession } from '../services/authService';
import type { IUser, UserRole } from '@architect/shared';

interface ProtectedRouteProps {
  children: ReactNode;
  /** אם מסופק - רק משתמשים עם אחד מהתפקידים האלה יורשו */
  roles?: UserRole[];
}

type Status = 'loading' | 'ok' | 'forbidden' | 'unauth';

/**
 * ProtectedRoute - מאמת מול /auth/me בכל טעינה.
 * - 401 → מפנה ל-/login
 * - חסר תפקיד מתאים → מפנה ל-/
 */
const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
  const [status, setStatus] = useState<Status>('loading');
  const rolesKey = useMemo(() => JSON.stringify(roles), [roles]);

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((user: IUser) => {
        if (cancelled) return;
        saveSession({ user });
        if (roles && !roles.includes(user.role)) {
          setStatus('forbidden');
        } else {
          setStatus('ok');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('unauth');
      });
    return () => {
      cancelled = true;
    };
  }, [rolesKey]);

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (status === 'unauth') return <Navigate to="/login" replace />;
  if (status === 'forbidden') return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
