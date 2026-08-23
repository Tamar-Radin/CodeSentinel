import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowRight } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Textarea from '../components/Textarea';
import Alert from '../components/Alert';
import { submitFeedback, FeedbackValidationError } from '../services/feedbackService';

interface FieldErrors {
  name?: string;
  email?: string;
  message?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateFields(name: string, email: string, message: string): FieldErrors {
  const errors: FieldErrors = {};
  if (name.trim().length < 2) errors.name = 'שם חייב להכיל לפחות 2 תווים';
  else if (name.trim().length > 100) errors.name = 'שם לא יכול להכיל יותר מ-100 תווים';
  if (!EMAIL_RE.test(email.trim())) errors.email = 'כתובת אימייל לא תקינה';
  if (message.trim().length < 10) errors.message = 'הודעה חייבת להכיל לפחות 10 תווים';
  else if (message.trim().length > 2000) errors.message = 'הודעה לא יכולה להכיל יותר מ-2000 תווים';
  return errors;
}

const FeedbackPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccess(false);

    const errors = validateFields(name, email, message);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await submitFeedback({ name: name.trim(), email: email.trim(), message: message.trim() });
      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
      setFieldErrors({});
    } catch (err: unknown) {
      if (err instanceof FeedbackValidationError) {
        setFieldErrors(err.fieldErrors);
      } else {
        setServerError(err instanceof Error ? err.message : 'שגיאה בשליחת הפנייה');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">יצירת קשר</h1>
          <Button variant="outline" size="sm" icon={ArrowRight} onClick={() => navigate('/shop')}>
            חזרה לחנות
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card title="שלחו לנו הודעה" subtitle="נשמח לשמוע מכם — משוב, שאלות או הצעות">
          {success && (
            <Alert type="success" title="תודה!">
              הפנייה נשלחה בהצלחה. נחזור אליכם בהקדם.
            </Alert>
          )}
          {serverError && (
            <Alert type="error" title="שגיאה">
              {serverError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="שם"
              placeholder="השם שלכם"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={fieldErrors.name}
            />
            <Input
              label="אימייל"
              type="email"
              placeholder="example@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
            />
            <Textarea
              label="הודעה"
              placeholder="מה תרצו לשתף אותנו?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              error={fieldErrors.message}
            />

            <Button
              variant="primary"
              size="lg"
              icon={Send}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? 'שולח...' : 'שלח פנייה'}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
};

export default FeedbackPage;
