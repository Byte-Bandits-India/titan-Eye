'use client';

import type { Column } from '@tanstack/react-table';
import type { HTMLAttributes, ReactNode } from 'react';

import { Subscribe } from '@tanstack/react-table';
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowLeftToLineIcon,
  ArrowRightIcon,
  ArrowRightToLineIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  PinOffIcon,
  Settings2Icon,
} from 'lucide-react';
import { memo, useMemo } from 'react';

import type { DataGridFeatures } from '@/components/reui/data-grid/data-grid';

import { getColumnHeaderLabel, useDataGrid } from '@/components/reui/data-grid/data-grid';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface DataGridColumnHeaderProps<TData extends object, TValue> extends HTMLAttributes<HTMLDivElement> {
  column: Column<DataGridFeatures, TData, TValue>;
  filter?: ReactNode;
  icon?: ReactNode;
  /** Reserved; pin controls are gated by tableLayout.columnsPinnable + column.getCanPin(). */
  pinnable?: boolean;
  /** When omitted, uses `column.columnDef.meta.headerTitle`, then a string `columnDef.header`, then `column.id`. */
  title?: string;
  visibility?: boolean;
}

function DataGridColumnHeaderInner<TData extends object, TValue>({
  className,
  column,
  filter,
  icon,
  title,
  visibility = false,
}: DataGridColumnHeaderProps<TData, TValue>) {
  const { isLoading, props, table } = useDataGrid();
  const resolvedTitle = title ?? getColumnHeaderLabel(column);

  // TanStack's columnOrder defaults to [] until a consumer seeds it; fall
  // back to the definition order so Move Left/Right work out of the box.
  const columnOrderState = table.state.columnOrder;
  const columnOrder =
    columnOrderState.length > 0
      ? columnOrderState
      : table.getAllLeafColumns().map((leafColumn) => leafColumn.id);
  const columnVisibilityKey =
    props.tableLayout?.columnsVisibility && visibility ? JSON.stringify(table.state.columnVisibility) : '';
  const isSorted = column.getIsSorted();
  const isPinned = column.getIsPinned();
  const canSort = column.getCanSort();
  const canPin = column.getCanPin();
  const canResize = column.getCanResize();

  const columnIndex = columnOrder.indexOf(column.id);
  const canMoveLeft = columnIndex > 0;
  const canMoveRight = columnIndex < columnOrder.length - 1;

  const handleSort = () => {
    if (isSorted === 'asc') {
      column.toggleSorting(true);
    } else if (isSorted === 'desc') {
      column.clearSorting();
    } else {
      column.toggleSorting(false);
    }
  };

  const headerLabelClassName = cn(
    'text-secondary-foreground/80 inline-flex h-full items-center gap-1.5 text-[0.8125rem] font-normal leading-[calc(1.125/0.8125)] [&_svg]:size-3.5 [&_svg]:opacity-60',
    className
  );

  const headerButtonClassName = cn(
    'text-secondary-foreground/80 h-6 rounded-lg px-2 font-normal hover:bg-secondary hover:text-foreground data-[state=open]:bg-secondary data-[state=open]:text-foreground',
    className
  );

  const sortIcon =
    canSort &&
    (isSorted === 'desc' ? (
      <ArrowDownIcon aria-hidden="true" className="size-3.25" />
    ) : isSorted === 'asc' ? (
      <ArrowUpIcon aria-hidden="true" className="size-3.25" />
    ) : (
      <ChevronsUpDownIcon aria-hidden="true" className="size-3.25 mt-px" />
    ));

  const hasControls =
    props.tableLayout?.columnsMovable ||
    (props.tableLayout?.columnsVisibility && visibility) ||
    (props.tableLayout?.columnsPinnable && canPin) ||
    filter;

  const menuItems = useMemo(() => {
    const items: ReactNode[] = [];
    let hasPreviousSection = false;

    // Filter section
    if (filter) {
      items.push(
        <DropdownMenuGroup key="group-filter">
          <DropdownMenuLabel key="filter">{filter}</DropdownMenuLabel>
        </DropdownMenuGroup>
      );
      hasPreviousSection = true;
    }

    // Sort section
    if (canSort) {
      if (hasPreviousSection) {
        items.push(<DropdownMenuSeparator key="sep-sort" />);
      }

      items.push(
        <DropdownMenuItem
          disabled={!canSort}
          key="sort-asc"
          onClick={() => {
            if (isSorted === 'asc') {
              column.clearSorting();
            } else {
              column.toggleSorting(false);
            }
          }}
        >
          <ArrowUpIcon className="size-3.5!" />
          <span className="grow">Asc</span>
          {isSorted === 'asc' && <CheckIcon className="opacity-100! size-4 text-primary" />}
        </DropdownMenuItem>,
        <DropdownMenuItem
          disabled={!canSort}
          key="sort-desc"
          onClick={() => {
            if (isSorted === 'desc') {
              column.clearSorting();
            } else {
              column.toggleSorting(true);
            }
          }}
        >
          <ArrowDownIcon className="size-3.5!" />
          <span className="grow">Desc</span>
          {isSorted === 'desc' && <CheckIcon className="opacity-100! size-4 text-primary" />}
        </DropdownMenuItem>
      );
      hasPreviousSection = true;
    }

    // Pin section
    if (props.tableLayout?.columnsPinnable && canPin) {
      if (hasPreviousSection) {
        items.push(<DropdownMenuSeparator key="sep-pin" />);
      }

      items.push(
        <DropdownMenuItem key="pin-left" onClick={() => column.pin(isPinned === 'start' ? false : 'start')}>
          <ArrowLeftToLineIcon aria-hidden="true" className="size-3.5!" />
          <span className="grow">Pin to left</span>
          {isPinned === 'start' && <CheckIcon className="opacity-100! size-4 text-primary" />}
        </DropdownMenuItem>,
        <DropdownMenuItem key="pin-right" onClick={() => column.pin(isPinned === 'end' ? false : 'end')}>
          <ArrowRightToLineIcon aria-hidden="true" className="size-3.5!" />
          <span className="grow">Pin to right</span>
          {isPinned === 'end' && <CheckIcon className="opacity-100! size-4 text-primary" />}
        </DropdownMenuItem>
      );
      hasPreviousSection = true;
    }

    // Move section
    if (props.tableLayout?.columnsMovable) {
      if (hasPreviousSection) {
        items.push(<DropdownMenuSeparator key="sep-move" />);
      }

      items.push(
        <DropdownMenuItem
          disabled={!canMoveLeft || isPinned !== false}
          key="move-left"
          onClick={() => {
            if (columnIndex > 0) {
              const newOrder = [...columnOrder];
              const [movedColumn] = newOrder.splice(columnIndex, 1);

              if (movedColumn !== undefined) {
                newOrder.splice(columnIndex - 1, 0, movedColumn);
              }

              table.setColumnOrder(newOrder);
            }
          }}
        >
          <ArrowLeftIcon aria-hidden="true" className="size-3.5!" />
          <span>Move to Left</span>
        </DropdownMenuItem>,
        <DropdownMenuItem
          disabled={!canMoveRight || isPinned !== false}
          key="move-right"
          onClick={() => {
            if (columnIndex < columnOrder.length - 1) {
              const newOrder = [...columnOrder];
              const [movedColumn] = newOrder.splice(columnIndex, 1);

              if (movedColumn !== undefined) {
                newOrder.splice(columnIndex + 1, 0, movedColumn);
              }

              table.setColumnOrder(newOrder);
            }
          }}
        >
          <ArrowRightIcon aria-hidden="true" className="size-3.5!" />
          <span>Move to Right</span>
        </DropdownMenuItem>
      );
      hasPreviousSection = true;
    }

    // Visibility section
    if (props.tableLayout?.columnsVisibility && visibility) {
      if (hasPreviousSection) {
        items.push(<DropdownMenuSeparator key="sep-visibility" />);
      }

      items.push(
        <DropdownMenuSub key="visibility">
          <DropdownMenuSubTrigger>
            <Settings2Icon className="size-3.5!" />
            <span>Columns</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((col) => (
                <DropdownMenuCheckboxItem
                  checked={col.getIsVisible()}
                  className="capitalize"
                  key={col.id}
                  onCheckedChange={(value) => col.toggleVisibility(!!value)}
                  onSelect={(event) => event.preventDefault()}
                >
                  {getColumnHeaderLabel(col)}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      );
    }

    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filter,
    canSort,
    isSorted,
    column,
    props.tableLayout?.columnsPinnable,
    props.tableLayout?.columnsMovable,
    props.tableLayout?.columnsVisibility,
    canPin,
    isPinned,
    canMoveLeft,
    canMoveRight,
    visibility,
    table,
    columnIndex,
    columnOrder,
    columnVisibilityKey, // Needed to update checkbox states when visibility changes
  ]);

  if (hasControls) {
    return (
      <div className="-ms-2 flex h-full items-center justify-between gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className={headerButtonClassName} disabled={isLoading} variant="ghost">
              {icon && icon}
              {resolvedTitle}
              {sortIcon}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            {menuItems}
          </DropdownMenuContent>
        </DropdownMenu>
        {props.tableLayout?.columnsPinnable && canPin && isPinned && (
          <Button
            aria-label={`Unpin ${resolvedTitle} column`}
            className="-me-1 size-7 rounded-lg"
            onClick={() => column.pin(false)}
            size="icon-sm"
            title={`Unpin ${resolvedTitle} column`}
            variant="ghost"
          >
            <PinOffIcon aria-hidden="true" className="size-3.5! opacity-50!" />
          </Button>
        )}
      </div>
    );
  }

  if (canSort || (props.tableLayout?.columnsResizable && canResize)) {
    return (
      <div className="-ms-2 flex h-full items-center">
        <Button className={headerButtonClassName} disabled={isLoading} onClick={handleSort} variant="ghost">
          {icon && icon}
          {resolvedTitle}
          {sortIcon}
        </Button>
      </div>
    );
  }

  return (
    <div className={headerLabelClassName}>
      {icon && icon}
      {resolvedTitle}
    </div>
  );
}

const DataGridColumnHeaderMemo = memo(DataGridColumnHeaderInner) as <TData extends object, TValue>(
  props: DataGridColumnHeaderProps<TData, TValue> & {
    /** Internal: the state slices the header re-renders on. Not part of the public API. */
    subscribedState?: unknown;
  }
) => ReactNode;

/**
 * Sort and pin state reaches this header through builder calls on `column`
 * (`getIsSorted()`, `getIsPinned()`), and `column` is a stable reference. That
 * combination is the one v9's fresh-table-per-state-change does NOT cover:
 * React Compiler is free to memoize against the stable column and never
 * re-evaluate those reads, which shows up as frozen sort arrows and pin
 * controls. The `Subscribe` below turns the slices this header actually reads
 * into a real reactive dependency, and threading the selection through as a
 * prop is what lets it past the `memo` - which would otherwise see unchanged
 * props and skip the render anyway.
 */
function DataGridColumnHeader<TData extends object, TValue>(props: DataGridColumnHeaderProps<TData, TValue>) {
  const { table } = useDataGrid();

  return (
    <Subscribe
      selector={(state) => ({
        columnOrder: state.columnOrder,
        columnPinning: state.columnPinning,
        columnVisibility: state.columnVisibility,
        sorting: state.sorting,
      })}
      source={table.store}
    >
      {(subscribed) => <DataGridColumnHeaderMemo {...props} subscribedState={subscribed} />}
    </Subscribe>
  );
}

export { DataGridColumnHeader, type DataGridColumnHeaderProps };
