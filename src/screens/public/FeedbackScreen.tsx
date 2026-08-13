import axios from 'axios';
import { CheckCircle2, MessageSquareText } from 'lucide-react';
import * as React from 'react';
import { useParams } from 'react-router-dom';

import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { API_BASE_URL } from '../../options/Option';

type LoadState = 'error' | 'loading' | 'ready';

export function FeedbackScreen() {
  const { token } = useParams<{ token: string }>();
  const [loadState, setLoadState] = React.useState<LoadState>(token ? 'loading' : 'error');
  const [customerName, setCustomerName] = React.useState('');
  const [feedback, setFeedback] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!token) {
      return;
    }

    axios
      .get<{ customerName: string; storeName: string }>(
        `${API_BASE_URL}/feedback/${encodeURIComponent(token)}`
      )
      .then((res) => {
        setCustomerName(res.data.customerName);
        setLoadState('ready');
      })
      .catch(() => setLoadState('error'));
  }, [token]);

  const handleSubmit = async () => {
    if (!token) {
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post(`${API_BASE_URL}/feedback/${encodeURIComponent(token)}`, { feedback });
      setSubmitted(true);
    } catch {
      setLoadState('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="bg-muted/40 flex min-h-screen w-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
        {loadState === 'loading' && <p className="text-sm text-muted-foreground">Loading…</p>}

        {loadState === 'error' && (
          <>
            <h1 className="mb-1 text-base font-bold text-foreground">Link Unavailable</h1>
            <p className="text-xs leading-relaxed text-muted-foreground">
              This feedback link is invalid or has expired. Please check with the store if you&apos;d like to
              leave feedback.
            </p>
          </>
        )}

        {loadState === 'ready' && !submitted && (
          <>
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <MessageSquareText size={18} />
            </div>
            <h1 className="mb-1 text-base font-bold text-foreground">
              Thanks for visiting{customerName ? `, ${customerName}` : ''}!
            </h1>
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              We&apos;d love to hear how your consultation went. Feedback is optional.
            </p>
            <Textarea
              className="mb-4 text-left"
              maxLength={2000}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your feedback (optional)"
              rows={5}
              value={feedback}
            />
            <Button
              className="h-9 w-full rounded-xl text-xs font-bold"
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Submitting…' : feedback.trim() ? 'Submit Feedback' : 'Skip'}
            </Button>
          </>
        )}

        {loadState === 'ready' && submitted && (
          <>
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
            <h1 className="mb-1 text-base font-bold text-foreground">Thank You!</h1>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Your feedback has been received. You can close this page now.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
