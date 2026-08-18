import { Box, MenuItem } from "@mui/material";
import { Icon } from "@mdi/react";
import { mdiGoogleDrive } from "@mdi/js";
import type { Label, Note } from "../../types";
import { serializeState } from "../../utils/storage";

type GoogleDriveTokenClient = {
  requestAccessToken: (options?: { force?: boolean }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
            }) => void;
          }) => GoogleDriveTokenClient;
        };
      };
    };
  }
}

const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_DRIVE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

type GoogleDriveBackupMenuItemProps = {
  onClose: () => void;
  onNotify: (
    severity: "success" | "error" | "info" | "warning",
    message: string,
  ) => void;
  labels: Label[];
  notes: Note[];
};

const loadGoogleIdentityScript = () =>
  new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => {
          reject(new Error("Failed to load Google Identity Services."));
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      reject(new Error("Failed to load Google Identity Services."));
    };
    document.head.appendChild(script);
  });

const GoogleDriveBackupMenuItem = ({
  onClose,
  onNotify,
  labels,
  notes,
}: GoogleDriveBackupMenuItemProps) => {
  const handleBackupToGoogleDrive = async () => {
    if (!GOOGLE_DRIVE_CLIENT_ID) {
      onNotify(
        "error",
        "Google Drive backup is not configured. Set VITE_GOOGLE_CLIENT_ID in your environment.",
      );
      return;
    }

    try {
      await loadGoogleIdentityScript();

      const googleAccounts = window.google?.accounts;
      const googleOauth2 = googleAccounts?.oauth2;

      if (!googleOauth2) {
        throw new Error("Google Drive authentication is not available yet.");
      }

      const accessTokenPromise = new Promise<string>((resolve, reject) => {
        const tokenClient = googleOauth2.initTokenClient({
          client_id: GOOGLE_DRIVE_CLIENT_ID,
          scope: GOOGLE_DRIVE_SCOPE,
          callback: (response) => {
            if (response.error) {
              reject(new Error(response.error));
              return;
            }

            if (!response.access_token) {
              reject(new Error("Google Drive access token was not returned."));
              return;
            }

            resolve(response.access_token);
          },
        });

        tokenClient.requestAccessToken();
      });

      const accessToken = await accessTokenPromise;
      const driveHeaders = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };

      const folderResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("name='adnothed' and mimeType='application/vnd.google-apps.folder' and trashed=false")}&spaces=drive&fields=files(id,name)`,
        {
          headers: driveHeaders,
        },
      );

      if (!folderResponse.ok) {
        const errorText = await folderResponse.text();
        throw new Error(
          `Google Drive folder lookup failed: ${folderResponse.status} ${folderResponse.statusText}${errorText ? ` - ${errorText}` : ""}`,
        );
      }

      const folderData = (await folderResponse.json()) as {
        files?: Array<{ id: string; name: string }>;
      };
      let folderId = folderData.files?.[0]?.id;

      if (!folderId) {
        const createFolderResponse = await fetch(
          "https://www.googleapis.com/drive/v3/files",
          {
            method: "POST",
            headers: driveHeaders,
            body: JSON.stringify({
              name: "adnothed",
              mimeType: "application/vnd.google-apps.folder",
            }),
          },
        );

        if (!createFolderResponse.ok) {
          const errorText = await createFolderResponse.text();
          throw new Error(
            `Google Drive folder creation failed: ${createFolderResponse.status} ${createFolderResponse.statusText}${errorText ? ` - ${errorText}` : ""}`,
          );
        }

        const createdFolder = (await createFolderResponse.json()) as {
          id?: string;
        };
        folderId = createdFolder.id;
      }

      if (!folderId) {
        throw new Error("Google Drive folder ID was not available.");
      }

      const payload = serializeState({ labels, notes });
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
        now.getDate(),
      )}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
      const fileName = `adnothed-state_${ts}.json`;

      const metadata = {
        name: fileName,
        mimeType: "application/json",
        parents: [folderId],
      };

      const formData = new FormData();
      formData.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" }),
      );
      formData.append(
        "file",
        new Blob([JSON.stringify(payload, null, 2)], {
          type: "application/json",
        }),
      );

      const response = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Google Drive upload failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`,
        );
      }

      const result = (await response.json()) as {
        name?: string;
      };
      onNotify(
        "success",
        `Backup uploaded to the adnothed folder${result.name ? `: ${result.name}` : ""}`,
      );
    } catch (error) {
      onNotify(
        "error",
        error instanceof Error ? error.message : "Failed to upload to Google Drive.",
      );
    }
  };

  return (
    <MenuItem
      onClick={() => {
        onClose();
        void handleBackupToGoogleDrive();
      }}
    >
      <Icon path={mdiGoogleDrive} size={0.8} />
      <Box component="span" sx={{ ml: 1 }}>
        Backup to GDrive
      </Box>
    </MenuItem>
  );
};

export default GoogleDriveBackupMenuItem;
