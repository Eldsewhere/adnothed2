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

self.addEventListener("notificationclick", (event) => {
  const action = event.action;
  const notification = event.notification;
  notification.close();

  if (action === "copy") {
    const textToCopy: string =
      (notification.data as { body?: string } | undefined)?.body ??
      notification.body;

    event.waitUntil(
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clients) => {
          for (const client of clients) {
            client.postMessage({ type: "COPY_TEXT", text: textToCopy });
            client.focus();
            return;
          }
          return self.clients.openWindow(self.location.origin + "/adnothed2/");
        }),
    );
    return;
  }

  // "open" action or default click — focus existing window or open a new one
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
