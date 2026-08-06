const URL_REGEX = /\b((https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?)/i;
const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const NUMBER_ONLY_REGEX = /[0-9]/;

export function containsUrl(text: string): boolean {
  return URL_REGEX.test(text);
}

export function containsEmail(text: string): boolean {
  return EMAIL_REGEX.test(text);
}

export function containsNumbers(text: string): boolean {
  return NUMBER_ONLY_REGEX.test(text);
}

export function splitTextByUrls(
  text: string,
): Array<{ value: string; isUrl: boolean }> {
  const parts = text.split(URL_REGEX);
  return parts
    .filter((part) => part !== "")
    .map((part) => ({
      value: part,
      isUrl: /^https?:\/\//i.test(part),
    }));
}
