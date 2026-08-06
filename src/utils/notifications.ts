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

  const registration = await navigator.serviceWorker.ready;
  const tag = `adnothed-item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await registration.showNotification(title, {
    body,
    icon: iconUrl,
    badge: badgeUrl,
    tag,
  });

  return "shown";
};
