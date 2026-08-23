import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ProductListPage from './pages/ProductListPage';
import ProductCreatePage from './pages/ProductCreatePage';
import CustomerHomePage from './pages/CustomerHomePage';
import FeedbackPage from './pages/FeedbackPage';
import ProtectedRoute from './components/ProtectedRoute';
import { getSession } from './services/authService';
import { navigateRef } from './services/navigateRef';

/* שורש: אדמין/מנהל → דשבורד; כל השאר (כולל אורחים) → חנות */
const RootRedirect = () => {
  const session = getSession();
  if (session && (session.role === 'admin' || session.role === 'manager')) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/shop" replace />;
};

const NavigateRefSetter = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigateRef.current = navigate;
    return () => { navigateRef.current = null; };
  }, [navigate]);
  return null;
};

function App() {
  return (
    <BrowserRouter>
      <NavigateRefSetter />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RootRedirect />} />
        {/* דשבורד ניהולי - admin/manager בלבד */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={['admin', 'manager']}>
              <HomePage />
            </ProtectedRoute>
          }
        />
        {/* דף ציבורי להצגת מוצרים */}
        <Route path="/products" element={<ProductListPage />} />
        {/* מסך לקוח / חנות - ציבורי */}
        <Route path="/shop" element={<CustomerHomePage />} />
        {/* טופס יצירת קשר / משוב - ציבורי */}
        <Route path="/feedback" element={<FeedbackPage />} />
        {/* יצירת מוצר - admin בלבד */}
        <Route
          path="/products/new"
          element={
            <ProtectedRoute roles={['admin']}>
              <ProductCreatePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
