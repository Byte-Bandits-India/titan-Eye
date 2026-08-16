export function formatHHMMSS(totalSeconds: number): string {
  const safeSeconds = isNaN(totalSeconds) ? 0 : Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatDurationLong(ms: number): string {
  return formatHHMMSS(Math.floor(Math.max(0, ms) / 1000));
}

export function formatSeconds(seconds: number): string {
  return formatHHMMSS(seconds);
}

export function parseTimestamp(val: null | number | string | undefined): number {
  if (!val) {
    return 0;
  }

  if (typeof val === 'number') {
    return val;
  }

  const num = parseInt(val, 10);

  if (!isNaN(num) && String(num).length >= 10) {
    return num;
  }

  const dateMs = new Date(val).getTime();

  return isNaN(dateMs) ? 0 : dateMs;
}
