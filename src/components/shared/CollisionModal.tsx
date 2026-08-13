import type { CollisionModalProps } from '../../types';

import { Button } from '../ui/button';

export function CollisionModal({ onCancel, onViewData, takenBy }: CollisionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl duration-200 animate-in fade-in zoom-in">
        <h3 className="mb-2 text-base font-bold text-foreground">Call Already Taken</h3>
        <p className="mb-6 text-xs leading-relaxed text-muted-foreground">
          This call is already taken by <strong className="text-foreground">{takenBy}</strong>. Do you want to
          view the data?
        </p>
        <div className="flex items-center justify-end gap-3">
          <Button
            className="h-8 rounded-xl px-4 text-xs font-bold"
            onClick={onCancel}
            size="sm"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="h-8 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700"
            onClick={onViewData}
            size="sm"
          >
            View Data
          </Button>
        </div>
      </div>
    </div>
  );
}
