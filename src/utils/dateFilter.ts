import type { AuditLog, Customer, ManagedUser } from '../types';

export type DateFilterRange = 'all' | 'day' | 'month' | 'week' | 'year';

export const DATE_FILTER_OPTIONS: { label: string; value: DateFilterRange }[] = [
  { label: 'All Time', value: 'all' },
  { label: 'Today (Day)', value: 'day' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
];

export function filterAuditLogsByDate(logs: AuditLog[], range: DateFilterRange): AuditLog[] {
  if (range === 'all') {
    return logs;
  }

  return logs.filter((log) => {
    const d = parseAnyDate(log.lastUpdatedOn || log.callStartTime);

    if (!d) {
      return false;
    }

    return isDateInRange(d, range);
  });
}

export function filterCustomersByDate(customers: Customer[], range: DateFilterRange): Customer[] {
  if (range === 'all') {
    return customers;
  }

  return customers.filter((cust) => {
    const d = parseAnyDate(cust.lastUpdatedOn || cust.callStartTime);

    if (!d) {
      return false;
    }

    return isDateInRange(d, range);
  });
}

export function filterUsersByDate(users: ManagedUser[], range: DateFilterRange): ManagedUser[] {
  if (range === 'all') {
    return users;
  }

  return users.filter((u) => {
    const d = parseAnyDate(u.lastLogin);

    if (!d) {
      return false;
    }

    return isDateInRange(d, range);
  });
}

export function isDateInRange(d: Date, range: DateFilterRange): boolean {
  if (range === 'all') {
    return true;
  }

  const now = new Date();

  if (range === 'day') {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  if (range === 'week') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    return d >= sevenDaysAgo;
  }

  if (range === 'month') {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    return d >= thirtyDaysAgo;
  }

  if (range === 'year') {
    return d.getFullYear() === now.getFullYear();
  }

  return true;
}

export function parseAnyDate(val: null | number | string | undefined): Date | null {
  if (!val) {
    return null;
  }

  if (typeof val === 'number') {
    return new Date(val);
  }

  const strVal = String(val).trim();

  if (!strVal || strVal.toLowerCase() === 'never') {
    return null;
  }

  const parsedNum = parseInt(strVal, 10);

  if (!isNaN(parsedNum) && String(parsedNum).length >= 10 && String(parsedNum) === strVal) {
    return new Date(parsedNum);
  }

  let dateObj = new Date(strVal);

  if (!isNaN(dateObj.getTime())) {
    return dateObj;
  }

  const datePartsMatch = strVal.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(.*)$/);

  if (datePartsMatch && datePartsMatch[1] && datePartsMatch[2] && datePartsMatch[3]) {
    const day = datePartsMatch[1].padStart(2, '0');
    const month = datePartsMatch[2].padStart(2, '0');
    const year = datePartsMatch[3];
    const restTime = datePartsMatch[4] || '';
    const isoTry = `${year}-${month}-${day}${restTime ? restTime.replace(',', '') : ''}`;
    dateObj = new Date(isoTry);

    if (!isNaN(dateObj.getTime())) {
      return dateObj;
    }
  }

  return null;
}
