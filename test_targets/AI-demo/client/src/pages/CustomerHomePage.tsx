import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Phone, Mail, MapPin, Clock, ShoppingBag } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { logout, getSession } from '../services/authService';
import Card from '../components/Card';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import type { IProductBase } from '@architect/shared/src/types/product';

const CONTACT_INFO = {
  phone: '03-1234567',
  email: 'support@example.com',
  address: 'רחוב הדוגמה 1, תל אביב',
  hours: 'א׳-ה׳ 09:00-18:00',
};

const CustomerHomePage = () => {
  const navigate = useNavigate();
  const [user] = useState(() => getSession());
  const [products, setProducts] = useState<IProductBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<{ products: IProductBase[] }>('/products')
      .then((res) => setProducts(res.data.products))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'שגיאה'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <ShoppingBag size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">החנות שלנו</h1>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Avatar fallback={user.name.slice(0, 2)} size="sm" />
                <span className="text-sm text-gray-700">שלום, {user.name}</span>
                <Button variant="outline" size="sm" icon={LogOut} onClick={handleLogout}>
                  התנתק
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                התחברות / הרשמה
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <Card title="המוצרים שלנו">
          {loading && <p className="text-center text-gray-500 py-6">טוען מוצרים...</p>}
          {error && <p className="text-center text-red-600 py-6">שגיאה: {error}</p>}
          {!loading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.length === 0 ? (
                <p className="col-span-full text-center text-gray-500 py-6">לא נמצאו מוצרים</p>
              ) : (
                products.map((p) => (
                  <div
                    key={p.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                  >
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    {p.category && (
                      <p className="text-xs text-gray-500 mt-1">{p.category}</p>
                    )}
                    {p.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{p.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <span className="text-lg font-bold text-blue-600">
                        ₪{p.price.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500">במלאי: {p.stock}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>

        <Card title="פרטי קשר">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="flex items-center gap-3">
              <Phone size={18} className="text-blue-600" />
              <span>{CONTACT_INFO.phone}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-blue-600" />
              <span>{CONTACT_INFO.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={18} className="text-blue-600" />
              <span>{CONTACT_INFO.address}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-blue-600" />
              <span>{CONTACT_INFO.hours}</span>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default CustomerHomePage;
