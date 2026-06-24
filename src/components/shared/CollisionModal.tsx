import { Button } from '../ui/button';
import type { CollisionModalProps } from '../../types';

export function CollisionModal({ takenBy, onCancel, onViewData }: CollisionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
      <div className="bg-card rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <h3 className="text-base font-bold text-foreground mb-2">Call Already Taken</h3>
        <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
          This call is already taken by{' '}
          <strong className="text-foreground">{takenBy}</strong>. Do you want to view the
          data?
        </p>
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-4 text-xs font-bold rounded-xl"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 px-4 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
            onClick={onViewData}
          >
            View Data
          </Button>
        </div>
      </div>
    </div>
  );
}
