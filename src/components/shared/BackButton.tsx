import { ChevronLeft } from 'lucide-react';

import { Button } from '../ui/button';

export type BackButtonProps = {
  onClick: () => void;
};

export function BackButton({ onClick }: BackButtonProps) {
  return (
    <Button
      className="active:scale-98 flex h-10 shrink-0 cursor-pointer items-center gap-2 self-start border-border bg-card px-5 text-sm font-medium text-muted-foreground shadow-sm transition-all hover:bg-muted sm:self-auto"
      onClick={onClick}
      type="button"
      variant="secondary"
    >
      <ChevronLeft size={16} />
      Back
    </Button>
  );
}
