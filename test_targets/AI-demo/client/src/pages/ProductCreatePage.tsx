import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import Alert from '../components/Alert';
import AiDescriptionPanel from '../components/AiDescriptionPanel';
import AiVisionPanel from '../components/AiVisionPanel';

const ProductCreatePage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post('/products', {
        name,
        description: description || undefined,
        price: Number(price),
        category: category || undefined,
        stock: stock === '' ? undefined : Number(stock),
      });
      navigate('/products');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת מוצר');
    } finally {
      setSubmitting(false);
    }
  };

  // הפאנלים של AI ממוקמים מחוץ ל-<form> כדי שלחיצה על הכפתורים שלהם
  // לא תפעיל submit (Button הקיים לא מעביר type="button" ל-DOM).
  const handleApplyVision = (data: {
    name: string;
    category: string;
    description: string;
    price: number;
  }) => {
    setName(data.name);
    setCategory(data.category);
    setDescription(data.description);
    setPrice(String(data.price));
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <Card title="הוספת מוצר חדש">
          <AiVisionPanel onApplyResult={handleApplyVision} />

          <AiDescriptionPanel
            productName={name}
            category={category}
            price={price}
            hasExistingDescription={description.trim().length > 0}
            onApplyDescription={setDescription}
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert type="error">{error}</Alert>}
            <Input
              label="שם המוצר"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
            <Input
              label="תיאור"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Input
              label="מחיר"
              type="number"
              min={0.01}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
            <Input
              label="קטגוריה"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <Input
              label="מלאי"
              type="number"
              min={0}
              step={1}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
            <div className="flex gap-3 pt-2">
              <Button
                variant="primary"
                icon={Package}
                disabled={submitting}
              >
                {submitting ? 'שומר...' : 'הוסף מוצר'}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/')}
              >
                ביטול
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ProductCreatePage;
