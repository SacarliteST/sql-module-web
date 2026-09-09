function parseAuditDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() <= 1) return null;
  return date;
}

export function formatAuditDateTime(value?: string | null): string {
  const date = parseAuditDate(value);
  return date
    ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(date)
    : 'Не указано';
}

export function formatAuditDate(value?: string | null): string {
  const date = parseAuditDate(value);
  return date
    ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short' }).format(date)
    : 'Не указано';
}

export function formatAuditActor(name?: string | null, id?: string | null): string {
  const normalizedName = name?.trim();
  if (normalizedName) return normalizedName;
  if (!id || id === '00000000-0000-0000-0000-000000000000') return 'Не указано';
  return id;
}
