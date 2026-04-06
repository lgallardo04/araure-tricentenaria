// =============================================================
// Escape seguro para CSV (evita inyección de fórmulas en Excel/LibreOffice)
// =============================================================

export function escapeCsvCell(value: unknown): string {
  if (value == null) return '';
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
