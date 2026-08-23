import { useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';
import type { IProductBase } from '@architect/shared/src/types/product';

/**
 * דף הצגת כל המוצרים (ציבורי)
 */
export default function ProductListPage() {
  const [products, setProducts] = useState<IProductBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiClient.get<{ products: IProductBase[] }>('/products')
      .then(res => {
        setProducts(res.data.products);
        setError(null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">רשימת מוצרים</h1>
      {loading && <div className="text-center">טוען...</div>}
      {error && <div className="text-red-600 text-center">שגיאה: {error}</div>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-right">שם</th>
                <th className="px-4 py-2 text-right">קטגוריה</th>
                <th className="px-4 py-2 text-right">מחיר</th>
                <th className="px-4 py-2 text-right">מלאי</th>
                <th className="px-4 py-2 text-right">תיאור</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-500">לא נמצאו מוצרים</td>
                </tr>
              ) : (
                products.map(product => (
                  <tr key={product.id} className="border-t">
                    <td className="px-4 py-2 font-medium">{product.name}</td>
                    <td className="px-4 py-2">{product.category || '-'}</td>
                    <td className="px-4 py-2">₪{product.price.toLocaleString()}</td>
                    <td className="px-4 py-2">{product.stock}</td>
                    <td className="px-4 py-2">{product.description || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}