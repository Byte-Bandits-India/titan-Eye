import type { Customer, User } from '../../../types';

import { Button } from '../../../components/ui/button';

type OptometristActionsCellProps = {
  activeCallTakenByMe?: Customer | null;
  onSelectCustomer: (id: string) => void;
  onSetEditing: (v: boolean) => void;
  req: Customer;
  user?: null | User;
};

export function OptometristActionsCell({ onSelectCustomer, onSetEditing, req }: OptometristActionsCellProps) {
  const handleAction = () => {
    onSelectCustomer(req.id);
    onSetEditing(true);
  };

  return (
    <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
      <Button
        className="h-8 gap-1.5 px-3 text-sm font-normal"
        onClick={handleAction}
        size="sm"
        variant="outline"
      >
        View
      </Button>
    </div>
  );
}
