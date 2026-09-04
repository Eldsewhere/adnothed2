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
    return `Yesterday • ${time}`;
  }

  const dow = DAY_ABBREVS[date.getDay()];
  const month = MONTH_ABBREVS[date.getMonth()];
  const day = pad(date.getDate());

  if (date.getFullYear() === now.getFullYear()) {
    return `${month} ${day} • ${time}`;
  }
  return `${month} ${day}, ${date.getFullYear()} • ${time}`;
}

export function isToday(timestamp: number): boolean {
  return isSameDay(new Date(timestamp * 1000), new Date());
}

export function isYesterday(timestamp: number): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(new Date(timestamp * 1000), yesterday);
}

const DAY_ABBREVS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_ABBREVS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatDueDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const pad = (value: number) => value.toString().padStart(2, "0");
  const now = new Date();

  const isMidnight = date.getHours() === 0 && date.getMinutes() === 0;
  const yearSuffix =
    date.getFullYear() !== now.getFullYear() ? `, ${date.getFullYear()}` : "";

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const month = MONTH_ABBREVS[date.getMonth()];
  const day = pad(date.getDate());

  if (isMidnight) {
    if (isSameDay(date, now)) return "Today";
    if (isSameDay(date, tomorrow)) return "Tomorrow";
    const dow = DAY_ABBREVS[date.getDay()];

    const dateText = `${month} ${day}${yearSuffix}`;
    if (date.getFullYear() !== now.getFullYear()) {
      return `${dateText} • 00:00`;
    }
    return dateText;
  }

  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const time = `${hours}:${minutes}`;

  if (isSameDay(date, now)) return `Today • ${time}`;
  if (isSameDay(date, tomorrow)) return `Tomorrow • ${time}`;

  const dow = DAY_ABBREVS[date.getDay()];

  const dateText = `${month} ${day}${yearSuffix}`;

  return `${dateText} • ${time}`;
}

export const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export function formatWeekday(timestamp: number): string | null {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (
    isSameDay(date, now) ||
    isSameDay(date, yesterday) ||
    isSameDay(date, tomorrow)
  ) {
    return null;
  }

  return `${DAY_ABBREVS[date.getDay()]}`;
}
