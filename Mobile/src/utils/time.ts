export function formatTimeAmPm(
  value?: string | number | Date | null,
): string {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  const hoursStr = String(hours12).padStart(2, '0');
  return `${hoursStr}:${minutes} ${period}`;
}
