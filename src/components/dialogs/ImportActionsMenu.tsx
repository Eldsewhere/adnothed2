import { Box, Menu, MenuItem } from "@mui/material";
import { Icon } from "@mdi/react";
import { mdiDownload, mdiGoogleDrive, mdiUpload } from "@mdi/js";
import type { Label, Note } from "../../types";
import { isGoogleDriveEnabled } from "../../utils/storage";
import { lazy, Suspense } from "react";

const GoogleDriveBackupMenuItem = lazy(
  () => import("./GoogleDriveBackupMenuItem"),
);

type ImportActionsMenuProps = {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onImport: () => void;
  onExport: () => void;
  labels: Label[];
  notes: Note[];
  onNotify: (
    severity: "success" | "error" | "info" | "warning",
    message: string,
  ) => void;
};

const ImportActionsMenu = ({
  anchorEl,
  onClose,
  onImport,
  onExport,
  labels,
  notes,
  onNotify,
}: ImportActionsMenuProps) => {
  const showGoogleDriveBackup = isGoogleDriveEnabled();

  return (
    <Menu
      id="labels-actions-menu"
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
    >
      {showGoogleDriveBackup && (
        <Suspense
          fallback={
            <MenuItem disabled>
              <Icon path={mdiGoogleDrive} size={0.8} />
              <Box component="span" sx={{ ml: 1 }}>
                Backup to GDrive
              </Box>
            </MenuItem>
          }
        >
          <GoogleDriveBackupMenuItem
            onClose={onClose}
            onNotify={onNotify}
            labels={labels}
            notes={notes}
          />
        </Suspense>
      )}
      <MenuItem
        onClick={() => {
          onClose();
          onExport();
        }}
      >
        <Icon path={mdiDownload} size={0.8} />
        <Box component="span" sx={{ ml: 1 }}>
          Save as JSON
        </Box>
      </MenuItem>

      <MenuItem
        onClick={() => {
          onClose();
          onImport();
        }}
      >
        <Icon path={mdiUpload} size={0.8} />
        <Box component="span" sx={{ ml: 1 }}>
          Import JSON
        </Box>
      </MenuItem>
    </Menu>
  );
};

export default ImportActionsMenu;
