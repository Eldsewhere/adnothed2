export const isNotificationSupported = () =>
  "Notification" in window && "serviceWorker" in navigator;

export type AppNotificationResult =
  | "shown"
  | "permission-denied"
  | "unsupported";

export const requestNotificationPermission =
  async (): Promise<NotificationPermission> => {
    if (!isNotificationSupported()) {
      return "denied";
    }
    if (Notification.permission === "default") {
      return Notification.requestPermission();
    }
    return Notification.permission;
  };

const getFirstNotificationUrl = (text: string): string | null => {
  const match = text.match(/\b((https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?)/i);
  if (!match) {
    return null;
  }
  return /^https?:\/\//i.test(match[0]) ? match[0] : `https://${match[0]}`;
};

export const showAppNotification = async (
  title: string,
  body: string,
): Promise<AppNotificationResult> => {
  if (!isNotificationSupported()) {
    return "unsupported";
  }

  if (Notification.permission === "default") {
    await requestNotificationPermission();
  }

  if (Notification.permission !== "granted") {
    return "permission-denied";
  }

  const baseUrl = import.meta.env.BASE_URL;
  const iconUrl = `${baseUrl}badge.png`;
  const badgeUrl = `${baseUrl}badge-notification.png`;
  const notificationUrl = getFirstNotificationUrl(body);

  const registration = await navigator.serviceWorker.ready;
  const tag = `adnothed-note-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await registration.showNotification(title, {
    body,
    icon: iconUrl,
    badge: badgeUrl,
    tag,
    data: { body, url: notificationUrl ?? undefined },
    actions: [
      { action: "open", title: "Open" },
      { action: "copy", title: "Copy" },
      { action: "share", title: "Share" },
    ],
  } as NotificationOptions);

  return "shown";
};
