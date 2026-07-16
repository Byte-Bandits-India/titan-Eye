/**
 * VAPT Fix #20: CSV/Excel Formula Injection Sanitizer
 *
 * Prefixes cells starting with formula-trigger characters with a single quote
 * to prevent malicious formula execution when CSV is opened in Excel/Calc.
 */

const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r', '\n'];

export function sanitizeCsvField(value: string): string {
  if (typeof value !== 'string') return String(value ?? '');
  const trimmed = value.trim();
  if (trimmed.length === 0) return trimmed;

  if (FORMULA_TRIGGERS.some(trigger => trimmed.startsWith(trigger))) {
    return `'${trimmed}`;
  }
  return trimmed;
}

export function sanitizeCsvRow(fields: string[]): string[] {
  return fields.map(sanitizeCsvField);
}

/**
 * Builds a full CSV string from headers and rows with formula injection protection.
 */
export function buildSafeCsv(headers: string[], rows: string[][]): string {
  const headerLine = sanitizeCsvRow(headers)
    .map(h => `"${h.replace(/"/g, '""')}"`)
    .join(',');

  const dataLines = rows.map(row =>
    sanitizeCsvRow(row)
      .map(cell => `"${cell.replace(/"/g, '""')}"`)
      .join(',')
  );

  return [headerLine, ...dataLines].join('\n');
}
