import { ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

import { Button } from '../ui/button';

interface CompleteCallModalProps {
  customerName: string;
  feedbackUrl: string;
  onClose: () => void;
}

export function CompleteCallModal({ customerName, feedbackUrl, onClose }: CompleteCallModalProps) {
  // Ensure local development links never use https:// to prevent SSL protocol errors on local ports
  const sanitizedUrl = feedbackUrl.replace(/^https:\/\/(localhost|127\.0\.0\.1)/i, 'http://$1');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 text-center shadow-2xl duration-200 animate-in fade-in zoom-in">
        <h3 className="mb-1 text-base font-medium text-foreground">Consultation Completed</h3>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          Ask <strong className="text-foreground">{customerName}</strong> to scan this code for a quick
          feedback survey on their visit.
        </p>

        <div className="mb-3 flex items-center justify-center rounded-xl border border-border bg-white p-4 shadow-inner">
          <QRCodeSVG size={192} value={sanitizedUrl} />
        </div>

        <div className="mb-5 flex justify-center">
          <a
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
            href={sanitizedUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span>Open feedback link</span>
            <ExternalLink size={12} />
          </a>
        </div>

        <Button className="h-9 w-full rounded-xl text-sm font-medium" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
