import { QRCodeSVG } from 'qrcode.react';

import { Button } from '../ui/button';

interface CompleteCallModalProps {
  customerName: string;
  feedbackUrl: string;
  onClose: () => void;
}

export function CompleteCallModal({ customerName, feedbackUrl, onClose }: CompleteCallModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 text-center shadow-2xl duration-200 animate-in fade-in zoom-in">
        <h3 className="mb-1 text-base font-bold text-foreground">Consultation Completed</h3>
        <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
          Ask <strong className="text-foreground">{customerName}</strong> to scan this code to share feedback
          on their visit &mdash; it&apos;s optional.
        </p>

        <div className="mb-5 flex items-center justify-center rounded-xl border border-border bg-white p-4">
          <QRCodeSVG size={192} value={feedbackUrl} />
        </div>

        <Button className="h-9 w-full rounded-xl text-xs font-bold" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
