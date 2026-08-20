import { ChevronLeft } from 'lucide-react';

import { Button } from '../ui/button';

export type BackButtonProps = {
  onClick: () => void;
};

export function BackButton({ onClick }: BackButtonProps) {
  return (
    <Button
      className="active:scale-98 flex h-9 shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-[50px] border-border bg-card px-4 text-xs font-medium text-muted-foreground shadow-sm transition-all hover:bg-muted sm:h-10 sm:self-auto"
      onClick={onClick}
      type="button"
      variant="outline"
    >
      <ChevronLeft size={16} />
      Back
    </Button>
  );
}
