import { Box, Menu, MenuItem } from "@mui/material";
import { Icon } from "@mdi/react";
import { mdiDownload, mdiUpload } from "@mdi/js";

type LabelsActionsMenuProps = {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onImport: () => void;
  onExport: () => void;
};

const LabelsActionsMenu = ({
  anchorEl,
  onClose,
  onImport,
  onExport,
}: LabelsActionsMenuProps) => (
  <Menu
    id="labels-actions-menu"
    anchorEl={anchorEl}
    open={Boolean(anchorEl)}
    onClose={onClose}
  >
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
  </Menu>
);

export default LabelsActionsMenu;
