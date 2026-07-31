export const isNotificationSupported = () =>
  'Notification' in window && 'serviceWorker' in navigator;

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  if (Notification.permission === 'default') {
    return Notification.requestPermission();
  }
  return Notification.permission;
};

export const showAppNotification = async (title: string, body: string) => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    body,
    icon: '/favicon.svg',
    tag: 'adnothed-item',
  });
};
