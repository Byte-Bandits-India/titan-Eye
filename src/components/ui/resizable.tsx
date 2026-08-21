import * as React from 'react';
import * as ResizablePrimitive from 'react-resizable-panels';

import { cn } from '../../lib/utils';

function ResizablePanelGroup({
  className,
  ...props
}: ResizablePrimitive.GroupProps) {
  return (
    <ResizablePrimitive.Group
      className={cn(
        'flex h-full w-full aria-[orientation=vertical]:flex-col',
        className
      )}
      data-slot="resizable-panel-group"
      {...props}
    />
  );
}

function ResizablePanel({ ...props }: ResizablePrimitive.PanelProps) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  className,
  withHandle,
  ...props
}: ResizablePrimitive.SeparatorProps & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitive.Separator
      className={cn(
        'group relative flex select-none touch-none items-center justify-center bg-slate-200 transition-colors dark:bg-zinc-800',
        'focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring',
        'aria-[orientation=vertical]:w-2.5 aria-[orientation=vertical]:cursor-col-resize hover:bg-blue-500/20 active:bg-blue-500/40',
        'aria-[orientation=horizontal]:h-3.5 aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:cursor-row-resize hover:bg-blue-500/20 active:bg-blue-500/40',
        className
      )}
      data-slot="resizable-handle"
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex shrink-0 rounded-full bg-slate-400 transition-colors group-hover:bg-blue-500 group-active:bg-blue-600 dark:bg-zinc-500 aria-[orientation=horizontal]:h-1 aria-[orientation=horizontal]:w-10 aria-[orientation=vertical]:h-10 aria-[orientation=vertical]:w-1" />
      )}
    </ResizablePrimitive.Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
