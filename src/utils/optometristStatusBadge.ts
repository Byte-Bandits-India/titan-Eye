import type { OptometristUserRow } from '../types';

export function rankAvailability(row: OptometristUserRow): number {
  if (row.avail.statusLabel === 'Available') {
    return 0;
  }

  if (row.avail.statusLabel.toLowerCase().startsWith('in call')) {
    return 1;
  }

  return 2;
}

export function getOptometristStatusBadge(row: OptometristUserRow): { classes: string; label: string } {
  return { classes: row.avail.badgeClass, label: row.avail.statusLabel };
}
