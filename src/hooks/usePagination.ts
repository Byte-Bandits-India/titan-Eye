import * as React from 'react';

import type { UsePaginationReturn } from '../types';

export function usePagination<T>(items: T[], pageSize: number): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = React.useState(1);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const paginatedItems = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;

    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  const goToPage = React.useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    },
    [totalPages]
  );

  const nextPage = React.useCallback(() => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const prevPage = React.useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const resetPage = React.useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    goToPage,
    nextPage,
    paginatedItems,
    prevPage,
    resetPage,
    totalItems,
    totalPages,
  };
}
