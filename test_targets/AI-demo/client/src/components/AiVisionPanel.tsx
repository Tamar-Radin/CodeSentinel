import { useEffect, useRef, useState } from 'react';
import { Upload, X, RefreshCw } from 'lucide-react';
import type { AiVisionResponse } from '@architect/shared';
import { analyzeImage, fileToDataUrl, validateImageFile } from '../services/aiService';
import Button from './Button';
import Alert from './Alert';

interface Props {
  onApplyResult: (data: { name: string; category: string; description: string; price: number }) => void;
}

const MAX_ATTEMPTS = 3;
const EXTRA_CONTEXT_LIMIT = 500;

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
};

const confidenceColor = (c: number): string => {
  if (c >= 0.95) return 'text-green-700 bg-green-50 border-green-200';
  if (c >= 0.8) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  return 'text-red-700 bg-red-50 border-red-200';
};

const sameFile = (a: File, b: File): boolean =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

const AiVisionPanel = ({ onApplyResult }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiVisionResponse | null>(null);
  const [extraContext, setExtraContext] = useState('');
  const [attempts, setAttempts] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const runAnalyze = async (imageDataUrl: string, ctx?: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const data = await analyzeImage(
        { imageDataUrl, extraContext: ctx?.trim() || undefined },
        controller.signal,
      );
      setResult(data);
      setAttempts((a) => a + 1);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'שגיאה בניתוח התמונה');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!selected) return;

    if (file && sameFile(file, selected)) {
      // אותו קובץ — לא מריצים ניתוח אוטומטי
      return;
    }

    const validationError = validateImageFile(selected);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(selected);
    previewUrlRef.current = url;

    setFile(selected);
    setPreviewUrl(url);
    setResult(null);
    setExtraContext('');
    setAttempts(0);
    setError(null);

    try {
      const dUrl = await fileToDataUrl(selected);
      setDataUrl(dUrl);
      await runAnalyze(dUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בעיבוד הקובץ');
    }
  };

  const handleClear = () => {
    abortRef.current?.abort();
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setFile(null);
    setPreviewUrl(null);
    setDataUrl(null);
    setResult(null);
    setError(null);
    setExtraContext('');
    setAttempts(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReanalyze = () => {
    if (!dataUrl) return;
    setAttempts(0);
    setExtraContext('');
    void runAnalyze(dataUrl);
  };

  const handleRetryWithContext = () => {
    if (!dataUrl) return;
    void runAnalyze(dataUrl, extraContext);
  };

  const handleApply = () => {
    if (!result) return;
    const price = Math.round((result.priceRange.min + result.priceRange.max) / 2);
    onApplyResult({
      name: result.name,
      category: result.category,
      description: result.description,
      price,
    });
  };

  const reachedMaxAttempts = attempts >= MAX_ATTEMPTS;
  const retryDisabled =
    loading || extraContext.trim().length === 0 || reachedMaxAttempts;

  return (
    <div
      dir="rtl"
      className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm"
    >
      <h3 className="text-base font-semibold text-gray-900 mb-3">📷 זיהוי מוצר מתמונה</h3>

      <div className="space-y-3">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
            id="ai-vision-file"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <label
              htmlFor="ai-vision-file"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer text-sm font-medium"
            >
              <Upload size={16} />
              העלה תמונה
            </label>
            {file && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="font-medium">{file.name}</span>
                <span className="text-gray-500">· {formatBytes(file.size)}</span>
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="נקה תמונה"
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {previewUrl && (
            <div className="mt-3">
              <img
                src={previewUrl}
                alt="תצוגה מקדימה"
                className="max-h-48 rounded border border-gray-200"
              />
            </div>
          )}
        </div>

        {loading && (
          <div className="text-sm text-gray-600">מנתח תמונה...</div>
        )}

        {error && <Alert type="error">{error}</Alert>}

        {result && (
          <div className="border-t border-gray-200 pt-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500">שם</div>
                <div className="font-medium text-gray-900">{result.name}</div>
              </div>
              <div>
                <div className="text-gray-500">קטגוריה</div>
                <div className="font-medium text-gray-900">{result.category}</div>
              </div>
              <div>
                <div className="text-gray-500">טווח מחיר</div>
                <div className="font-medium text-gray-900">
                  ₪{result.priceRange.min} – ₪{result.priceRange.max}
                  <span className="text-gray-500 font-normal">
                    {' '}
                    (ממוצע: ₪{Math.round((result.priceRange.min + result.priceRange.max) / 2)})
                  </span>
                </div>
              </div>
              <div>
                <div className="text-gray-500">בטחון</div>
                <span
                  className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${confidenceColor(result.confidence)}`}
                >
                  {(result.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div>
              <div className="text-gray-500 text-sm">תיאור</div>
              <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                {result.description}
              </p>
            </div>

            {result.needsMoreInfo && !reachedMaxAttempts && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 space-y-2">
                <div className="text-sm text-yellow-800">
                  ⚠️ הזיהוי אינו ודאי. הוסף תיאור משלים לדיוק טוב יותר:
                </div>
                <textarea
                  value={extraContext}
                  onChange={(e) =>
                    setExtraContext(e.target.value.slice(0, EXTRA_CONTEXT_LIMIT))
                  }
                  maxLength={EXTRA_CONTEXT_LIMIT}
                  rows={3}
                  placeholder="לדוגמה: זהו שעון חכם של חברת Apple"
                  className="block w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {extraContext.length}/{EXTRA_CONTEXT_LIMIT} · ניסיונות: {attempts}/{MAX_ATTEMPTS}
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={retryDisabled}
                    onClick={handleRetryWithContext}
                  >
                    עדכן זיהוי עם המידע הנוסף
                  </Button>
                </div>
              </div>
            )}

            {reachedMaxAttempts && (
              <Alert type="warning">
                המודל לא בטוח, מלא את השדות ידנית
              </Alert>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button variant="success" onClick={handleApply}>
                החל על הטופס
              </Button>
              <Button
                variant="outline"
                icon={RefreshCw}
                disabled={loading || !dataUrl}
                onClick={handleReanalyze}
              >
                נתח מחדש
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiVisionPanel;
