import type { Column } from '@tanstack/react-table';

import { CheckIcon, CirclePlusIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { DataGridFeatures } from '@/components/reui/data-grid/data-grid';

import { Badge } from '@/components/reui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface DataGridColumnFilterProps<TData extends object, TValue> {
  column?: Column<DataGridFeatures, TData, TValue>;
  options: {
    icon?: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
  }[];
  title?: string;
}

function DataGridColumnFilter<TData extends object, TValue>({
  column,
  options,
  title,
}: DataGridColumnFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues();
  const filterValue = column?.getFilterValue();
  const selectedValues = new Set(Array.isArray(filterValue) ? (filterValue as string[]) : []);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchQuery) {
      return options;
    }

    return options.filter((option) => option.label.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [options, searchQuery]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="secondary">
          <CirclePlusIcon className="size-4" />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator className="mx-2 h-4" orientation="vertical" />
              <Badge className="px-1 font-normal lg:hidden" variant="secondary">
                {selectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge className="px-1 font-normal" variant="secondary">
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge className="px-1 font-normal" key={option.value} variant="secondary">
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[200px] p-0">
        <div className="p-2">
          <Input
            className="h-8"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={title}
            value={searchQuery}
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No results found.</div>
          ) : (
            <div className="p-1">
              {filteredOptions.map((option) => {
                const isSelected = selectedValues.has(option.value);
                const facetCount = facets?.get(option.value);

                const toggleOption = () => {
                  if (isSelected) {
                    selectedValues.delete(option.value);
                  } else {
                    selectedValues.add(option.value);
                  }

                  const filterValues = Array.from(selectedValues);
                  column?.setFilterValue(filterValues.length ? filterValues : undefined);
                };

                return (
                  <div
                    aria-pressed={isSelected}
                    className={cn(
                      'outline-hidden relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                      'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground'
                    )}
                    key={option.value}
                    onClick={toggleOption}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleOption();
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                        isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </div>
                    {option.icon && <option.icon className="h-4 w-4 text-muted-foreground" />}
                    <span>{option.label}</span>
                    {facetCount !== undefined && (
                      <span className="ms-auto flex h-4 w-4 items-center justify-center font-mono text-sm">
                        {facetCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {selectedValues.size > 0 && (
            <>
              <div className="-mx-1 my-1 h-px bg-border" />
              <div className="p-1">
                <div
                  className="outline-hidden relative flex cursor-pointer select-none items-center justify-center rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                  onClick={() => column?.setFilterValue(undefined)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      column?.setFilterValue(undefined);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  Clear filters
                </div>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DataGridColumnFilter, type DataGridColumnFilterProps };
