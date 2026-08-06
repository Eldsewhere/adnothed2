export const isNotificationSupported = () =>
  "Notification" in window && "serviceWorker" in navigator;

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

export const showAppNotification = async (title: string, body: string) => {
  if (!isNotificationSupported()) {
    return;
  }

  if (Notification.permission === "default") {
    await requestNotificationPermission();
  }

  if (Notification.permission !== "granted") {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const tag = `adnothed-item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await registration.showNotification(title, {
    body,
    icon: "/favicon.svg",
    badge: "/badge.svg",
    tag,
  });
};
