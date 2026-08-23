import { useEffect, useRef, useState } from 'react';
import { Plus, X, Sparkles, RefreshCw } from 'lucide-react';
import type { AiDescriptionRequest, AiDescriptionResponse } from '@architect/shared';
import { generateDescription } from '../services/aiService';
import Input from './Input';
import Button from './Button';
import Alert from './Alert';

interface Props {
  productName: string;
  category: string;
  price: string;
  hasExistingDescription: boolean;
  onApplyDescription: (text: string) => void;
}

const buildPayload = (
  productName: string,
  category: string,
  price: string,
  audience: string,
  keyFeatures: string[],
): AiDescriptionRequest => {
  const features = keyFeatures.map((f) => f.trim()).filter(Boolean);
  const priceNum = price.trim() === '' ? undefined : Number(price);
  return {
    name: productName.trim(),
    category: category.trim() || undefined,
    audience: audience.trim() || undefined,
    price: priceNum !== undefined && !Number.isNaN(priceNum) ? priceNum : undefined,
    keyFeatures: features.length ? features : undefined,
    language: 'he',
  };
};

const AiDescriptionPanel = ({
  productName,
  category,
  price,
  hasExistingDescription,
  onApplyDescription,
}: Props) => {
  const [audience, setAudience] = useState('');
  const [keyFeatures, setKeyFeatures] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiDescriptionResponse | null>(null);
  const [lastInputHash, setLastInputHash] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const updateFeature = (idx: number, value: string) => {
    setKeyFeatures((prev) => prev.map((f, i) => (i === idx ? value : f)));
  };

  const addFeature = () => setKeyFeatures((prev) => [...prev, '']);

  const removeFeature = (idx: number) => {
    setKeyFeatures((prev) => (prev.length === 1 ? [''] : prev.filter((_, i) => i !== idx)));
  };

  const runGeneration = async (force: boolean) => {
    const payload = buildPayload(productName, category, price, audience, keyFeatures);
    const hash = JSON.stringify(payload);

    if (!force && result && hash === lastInputHash) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const data = await generateDescription(payload, controller.signal);
      setResult(data);
      setLastInputHash(hash);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'שגיאה בייצור התיאור');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    if (hasExistingDescription) {
      const ok = window.confirm('להחליף את התיאור הקיים?');
      if (!ok) return;
    }
    onApplyDescription(result.description);
  };

  const primaryDisabled = productName.trim().length < 2 || loading;

  return (
    <div
      dir="rtl"
      className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm"
    >
      <h3 className="text-base font-semibold text-gray-900 mb-3">✨ ייצור תיאור אוטומטי</h3>

      <div className="space-y-3">
        <Input
          label="קהל יעד (אופציונלי)"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          placeholder="לדוגמה: סטודנטים, אנשי עסקים"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">מאפיינים</label>
          <div className="space-y-2">
            {keyFeatures.map((f, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    value={f}
                    onChange={(e) => updateFeature(idx, e.target.value)}
                    placeholder="לדוגמה: עמיד למים"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeFeature(idx)}
                  aria-label="הסר מאפיין"
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addFeature}
            className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <Plus size={14} /> הוסף מאפיין
          </button>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="primary"
            icon={Sparkles}
            disabled={primaryDisabled}
            onClick={() => runGeneration(false)}
          >
            {loading ? 'מייצר...' : 'ייצר תיאור'}
          </Button>
          {result && (
            <Button
              variant="outline"
              icon={RefreshCw}
              disabled={loading}
              onClick={() => runGeneration(true)}
            >
              ייצר מחדש
            </Button>
          )}
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {result && (
          <div className="border-t border-gray-200 pt-3 mt-2 space-y-3">
            {result.meta?.cached && (
              <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                מהמטמון
              </span>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">תיאור</h4>
              <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                {result.description}
              </p>
            </div>

            {result.bullets?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">נקודות עיקריות</h4>
                <ul className="list-disc pr-5 text-sm text-gray-800 space-y-1">
                  {result.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.seoTags?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">תגיות SEO</h4>
                <div className="flex flex-wrap gap-1.5">
                  {result.seoTags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Button variant="success" onClick={handleApply}>
              החל על הטופס
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiDescriptionPanel;
