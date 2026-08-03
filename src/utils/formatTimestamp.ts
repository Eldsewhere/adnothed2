export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const pad = (value: number) => value.toString().padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());

  return `${year}-${month}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const pad = (value: number) => value.toString().padStart(2, "0");

  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const time = `${hours}:${minutes}`;

  const now = new Date();
  if (isSameDay(date, now)) {
    return time;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) {
    return `Yesterday, ${time}`;
  }

  return `${formatDate(timestamp)} ${time}`;
}

export function isToday(timestamp: number): boolean {
  return isSameDay(new Date(timestamp * 1000), new Date());
}

export function isYesterday(timestamp: number): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(new Date(timestamp * 1000), yesterday);
}

export const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
