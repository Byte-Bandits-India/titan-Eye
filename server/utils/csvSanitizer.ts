const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r', '\n'];

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

export function sanitizeCsvField(value: string): string {
  if (typeof value !== 'string') {return String(value ?? '');}

  const trimmed = value.trim();

  if (trimmed.length === 0) {return trimmed;}

  if (FORMULA_TRIGGERS.some(trigger => trimmed.startsWith(trigger))) {
    return `'${trimmed}`;
  }

  return trimmed;
}

export function sanitizeCsvRow(fields: string[]): string[] {
  return fields.map(sanitizeCsvField);
}
