import { memo } from 'react';
import type { Customer } from '../../../types';

import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';

export type DeleteCustomerDialogProps = {
  customer: Customer | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
};

export const DeleteCustomerDialog = memo(function DeleteCustomerDialog({
  customer,
  isSubmitting,
  onConfirm,
  onOpenChange,
}: DeleteCustomerDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={Boolean(customer)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Customer</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Delete {customer?.name || "this customer"}'s details? This cannot be undone.
        </p>

        <DialogFooter>
          <Button disabled={isSubmitting} onClick={() => onOpenChange(false)} variant="secondary">
            Cancel
          </Button>
          <Button disabled={isSubmitting} onClick={onConfirm} variant="destructive">
            {isSubmitting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
},
(prevProps, nextProps) => {
  if (!prevProps.customer && !nextProps.customer) {
    return prevProps.isSubmitting === nextProps.isSubmitting;
  }

  return (
    prevProps.customer?.id === nextProps.customer?.id &&
    prevProps.isSubmitting === nextProps.isSubmitting
  );
}
);
