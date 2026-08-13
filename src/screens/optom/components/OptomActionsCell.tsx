import type { CollisionModalData, Customer, User } from '../../../types';

import { Button } from '../../../components/ui/button';

type OptomActionsCellProps = {
  activeCallTakenByMe: Customer | null;
  onSelectCustomer: (id: string) => void;
  onSetCollision: (data: CollisionModalData) => void;
  onSetEditing: (v: boolean) => void;
  req: Customer;
  user: null | User;
};

export function OptomActionsCell({
  activeCallTakenByMe,
  onSelectCustomer,
  onSetCollision,
  onSetEditing,
  req,
  user,
}: OptomActionsCellProps) {
  const isTakenByAnotherDoctor = (() => {
    if (!req.callActive || !req.callTakenBy) {
      return false;
    }

    if (!user) {
      return true;
    }

    const takenByLower = req.callTakenBy.toLowerCase();

    return takenByLower !== user.name.toLowerCase() && takenByLower !== user.email.toLowerCase();
  })();

  const handleAction = () => {
    if (isTakenByAnotherDoctor) {
      onSetCollision({
        id: req.id,
        name: req.name,
        takenBy: req.callTakenBy || 'another agent',
      });
    } else if (activeCallTakenByMe && activeCallTakenByMe.id !== req.id && user) {
      onSetCollision({
        id: req.id,
        name: req.name,
        takenBy: `you (${user.name} - active call #${activeCallTakenByMe.id} in progress)`,
      });
    } else {
      onSelectCustomer(req.id);
      onSetEditing(true);
    }
  };

  return (
    <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
      <Button
        className="h-7 cursor-pointer rounded-[50px] px-3 text-[10px] font-bold"
        onClick={handleAction}
        size="sm"
        variant="gradient"
      >
        View
      </Button>
    </div>
  );
}
