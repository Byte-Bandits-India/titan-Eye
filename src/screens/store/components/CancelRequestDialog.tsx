import * as React from 'react';

import type { Customer } from '../../../types';

import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';

const CANCEL_REASONS = [
  'Not ready to wait',
  'Long optometrist wait time',
  'Not interested in eye test',
  'Prefers in-store optometrist',
  'Technical issue',
];

export type CancelRequestDialogProps = {
  customer: Customer | null;
  isSubmitting: boolean;
  onConfirm: (reason: string) => void;
  onOpenChange: (open: boolean) => void;
};

export function CancelRequestDialog({
  customer,
  isSubmitting,
  onConfirm,
  onOpenChange,
}: CancelRequestDialogProps) {
  const [reason, setReason] = React.useState<null | string>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setReason(null);
    }

    onOpenChange(nextOpen);
  };

  const handleConfirm = () => {
    if (!reason) {
      return;
    }

    onConfirm(reason);
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={Boolean(customer)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {customer?.name
              ? `Why is the request for ${customer.name} being cancelled?`
              : 'Select a reason for cancellation'}
          </p>

          <div className="space-y-2">
            {CANCEL_REASONS.map((option) => (
              <label
                className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                key={option}
              >
                <Checkbox
                  checked={reason === option}
                  disabled={isSubmitting}
                  onCheckedChange={() => setReason(option)}
                />
                {option}
              </label>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button disabled={isSubmitting} onClick={() => handleOpenChange(false)} variant="outline">
            Back
          </Button>
          <Button disabled={!reason || isSubmitting} onClick={handleConfirm} variant="gradient">
            {isSubmitting ? 'Cancelling…' : 'Cancel Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
