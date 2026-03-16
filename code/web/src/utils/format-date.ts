import { getMessages } from '@/locales';

const COMMON = getMessages().common;

/**
 * Format timestamp to HH:mm (today) or DD/MM (before today).
 * Timezone: Asia/Ho_Chi_Minh (UTC+7).
 */
export function formatEventTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString(COMMON.locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: COMMON.timezone,
    });
  }

  return date.toLocaleDateString(COMMON.locale, {
    day: '2-digit',
    month: '2-digit',
    timeZone: COMMON.timezone,
  });
}

/**
 * Format date to weekday label (T2..CN) for compliance chart.
 */
export function formatWeekday(isoDateString: string): string {
  const date = new Date(isoDateString + 'T00:00:00');
  const day = date.getDay(); // 0=Sun
  return COMMON.weekdays[day];
}
