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
    return `${dow}, ${month} ${day} • ${time}`;
  }
  return `${dow}, ${month} ${day}, ${date.getFullYear()} • ${time}`;
}

export function isToday(timestamp: number): boolean {
  return isSameDay(new Date(timestamp * 1000), new Date());
}

export function isYesterday(timestamp: number): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(new Date(timestamp * 1000), yesterday);
}

const DAY_ABBREVS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

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
  const daysAfterTodayMidnight = Math.floor(
    (date.getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const daysAfter = daysAfterTodayMidnight > 0 ? daysAfterTodayMidnight : 0;

  if (isMidnight) {
    if (isSameDay(date, now)) return "Today";
    if (isSameDay(date, tomorrow)) return "Tomorrow";
    const dow = DAY_ABBREVS[date.getDay()];

    const dateText = `${dow}, ${month} ${day}${yearSuffix} (in ${daysAfter} days)`;
    if (date.getFullYear() !== now.getFullYear()) {
      return `${dateText} at 00:00`;
    }
    return dateText;
  }

  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const time = `${hours}:${minutes}`;

  if (isSameDay(date, now)) return `Today • ${time}`;
  if (isSameDay(date, tomorrow)) return `Tomorrow • ${time}`;

  const dow = DAY_ABBREVS[date.getDay()];

  const dateText = `${dow}, ${month} ${day}${yearSuffix} (in ${daysAfter} days)`;

  if (date.getFullYear() !== now.getFullYear()) {
    return `${dateText} at ${time}`;
  }

  return `${dateText} • ${time}`;
}

export const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
