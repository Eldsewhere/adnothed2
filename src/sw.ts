/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { clientsClaim } from "workbox-core";

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")));

const getFirstNotificationUrl = (text: string): string | null => {
  const match = text.match(/\b((https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?)/i);
  if (!match) {
    return null;
  }
  return /^https?:\/\//i.test(match[0]) ? match[0] : `https://${match[0]}`;
};

self.addEventListener("notificationclick", (event) => {
  const action = event.action;
  const notification = event.notification;
  const textToShare: string =
    (notification.data as { body?: string } | undefined)?.body ??
    notification.body;
  const shareUrl: string | null =
    (notification.data as { url?: string } | undefined)?.url ??
    getFirstNotificationUrl(textToShare);

  if (action === "copy") {
    event.waitUntil(
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clients) => {
          for (const client of clients) {
            client.postMessage({
              type: "COPY_TEXT",
              text: textToShare,
            });
            client.focus();
            return;
          }
          return self.clients.openWindow(self.location.origin + "/adnothed2/");
        }),
    );
    return;
  }

  if (action === "share") {
    event.waitUntil(
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clients) => {
          for (const client of clients) {
            client.postMessage({
              type: "SHARE_TEXT",
              text: textToShare,
              url: shareUrl ?? undefined,
            });
            client.focus();
            return;
          }
          return self.clients.openWindow(self.location.origin + "/adnothed2/");
        }),
    );
    return;
  }

  if (shareUrl) {
    event.waitUntil(self.clients.openWindow(shareUrl));
    return;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          client.focus();
          return;
        }
        return self.clients.openWindow(self.location.origin + "/adnothed2/");
      }),
  );
});
