import type { Customer, User } from '../../../types';

import { Button } from '../../../components/ui/button';

type OptomActionsCellProps = {
  activeCallTakenByMe?: Customer | null;
  onSelectCustomer: (id: string) => void;
  onSetEditing: (v: boolean) => void;
  req: Customer;
  user?: null | User;
};

export function OptomActionsCell({ onSelectCustomer, onSetEditing, req }: OptomActionsCellProps) {
  const handleAction = () => {
    onSelectCustomer(req.id);
    onSetEditing(true);
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
