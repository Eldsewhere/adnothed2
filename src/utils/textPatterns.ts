const URL_REGEX = /(https?:\/\/[^\s]+)/gi;
const NUMBER_ONLY_REGEX = /^[0-9]+$/;

export function containsUrl(text: string): boolean {
  return new RegExp(URL_REGEX).test(text);
}

export function isOnlyNumbers(text: string): boolean {
  return NUMBER_ONLY_REGEX.test(text.trim());
}

export function splitTextByUrls(text: string): Array<{ value: string; isUrl: boolean }> {
  const parts = text.split(URL_REGEX);
  return parts.filter((part) => part !== '').map((part) => ({
    value: part,
    isUrl: /^https?:\/\//i.test(part),
  }));
}
