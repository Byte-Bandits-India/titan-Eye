import axios from 'axios';
import { CheckCircle2, MessageSquareText } from 'lucide-react';
import * as React from 'react';
import { useParams } from 'react-router-dom';

import type { FeedbackEase, FeedbackExperience, FeedbackRecommend } from '../../types';

import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { API_BASE_URL } from '../../options/Option';

type LoadState = 'error' | 'loading' | 'ready';

const EASE_OPTIONS: FeedbackEase[] = ['Very Easy', 'Easy', 'Okay', 'Difficult'];
const EXPERIENCE_OPTIONS: FeedbackExperience[] = ['Excellent', 'Good', 'Average', 'Poor'];
const RECOMMEND_OPTIONS: FeedbackRecommend[] = ['Yes', 'Maybe', 'No'];

function ChoiceGroup<T extends string>({
  onSelect,
  options,
  value,
}: {
  onSelect: (value: T) => void;
  options: T[];
  value: null | T;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((option) => (
        <button
          className={cn(
            'rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
            value === option
              ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
              : 'border-border bg-card text-foreground hover:bg-muted'
          )}
          key={option}
          onClick={() => onSelect(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function FeedbackScreen() {
  const { token } = useParams<{ token: string }>();
  const [loadState, setLoadState] = React.useState<LoadState>(token ? 'loading' : 'error');
  const [customerName, setCustomerName] = React.useState('');
  const [feedbackEase, setFeedbackEase] = React.useState<FeedbackEase | null>(null);
  const [feedbackExperience, setFeedbackExperience] = React.useState<FeedbackExperience | null>(null);
  const [feedbackRecommend, setFeedbackRecommend] = React.useState<FeedbackRecommend | null>(null);
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

  const isComplete = feedbackEase && feedbackExperience && feedbackRecommend;

  const handleSubmit = async () => {
    if (!token || !isComplete) {
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post(`${API_BASE_URL}/feedback/${encodeURIComponent(token)}`, {
        feedbackEase,
        feedbackExperience,
        feedbackRecommend,
      });
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
            <p className="text-sm leading-relaxed text-muted-foreground">
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
            <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
              We&apos;d love to hear how your consultation went.
            </p>

            <div className="mb-5 text-left">
              <p className="mb-2 text-sm font-semibold text-foreground">How easy was the eye test?</p>
              <ChoiceGroup onSelect={setFeedbackEase} options={EASE_OPTIONS} value={feedbackEase} />
            </div>

            <div className="mb-5 text-left">
              <p className="mb-2 text-sm font-semibold text-foreground">How was your experience?</p>
              <ChoiceGroup
                onSelect={setFeedbackExperience}
                options={EXPERIENCE_OPTIONS}
                value={feedbackExperience}
              />
            </div>

            <div className="mb-5 text-left">
              <p className="mb-2 text-sm font-semibold text-foreground">
                Would you recommend this eye test to others?
              </p>
              <ChoiceGroup onSelect={setFeedbackRecommend} options={RECOMMEND_OPTIONS} value={feedbackRecommend} />
            </div>

            <Button
              className="h-9 w-full rounded-xl text-sm font-medium"
              disabled={isSubmitting || !isComplete}
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Submitting…' : 'Submit Feedback'}
            </Button>
          </>
        )}

        {loadState === 'ready' && submitted && (
          <>
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
            <h1 className="mb-1 text-base font-bold text-foreground">Thank You!</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your feedback has been received. You can close this page now.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
