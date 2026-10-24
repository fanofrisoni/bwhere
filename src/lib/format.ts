// Date + time without seconds, in the device's locale (e.g. "25/10/2026, 7:00 p.m.").
export function formatEventTime(date: Date): string {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
}
