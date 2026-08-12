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
      <div className="bg-card rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200 text-center">
        <h3 className="text-base font-bold text-foreground mb-1">Consultation Completed</h3>
        <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
          Ask <strong className="text-foreground">{customerName}</strong> to scan this code to share
          feedback on their visit &mdash; it&apos;s optional.
        </p>

        <div className="flex items-center justify-center rounded-xl border border-border bg-white p-4 mb-5">
          <QRCodeSVG size={192} value={feedbackUrl} />
        </div>

        <Button className="h-9 w-full text-xs font-bold rounded-xl" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
