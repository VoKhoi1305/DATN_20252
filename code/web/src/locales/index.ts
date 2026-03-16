import * as vi from './vi';

export type Locale = 'vi';

const locales = { vi } as const;

// Change this to switch locale globally
const currentLocale: Locale = 'vi';

export function getMessages() {
  return locales[currentLocale];
}

export function getLocale(): Locale {
  return currentLocale;
}
