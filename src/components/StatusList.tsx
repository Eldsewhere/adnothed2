import { useState } from "react";
import {
  Alert,
  Box,
  colors,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableContainer,
} from "@mui/material";
import { Icon } from "@mdi/react";
import { mdiPencil, mdiTrashCanOutline } from "@mdi/js";
import type { Status } from "../types";
import StatusListRow from "./StatusListRow";

type StatusListProps = {
  statuses: Status[];
  onEdit: (status: Status) => void;
  onDelete: (status: Status) => void;
  newStatusId?: string | null;
};

const StatusList = ({ statuses, onEdit, onDelete, newStatusId }: StatusListProps) => {
  const [menuState, setMenuState] = useState<{
    anchorEl: HTMLElement | null;
    status: Status | null;
  }>({ anchorEl: null, status: null });

  const handleOpenMenu = (
    event: React.MouseEvent<HTMLElement>,
    status: Status,
  ) => {
    setMenuState({ anchorEl: event.currentTarget, status });
  };

  const handleCloseMenu = () => {
    setMenuState({ anchorEl: null, status: null });
  };

  const handleMenuEdit = () => {
    if (menuState.status) {
      onEdit(menuState.status);
    }
    handleCloseMenu();
  };

  const handleMenuDelete = () => {
    if (menuState.status) {
      onDelete(menuState.status);
    }
    handleCloseMenu();
  };

  const orderedStatuses = statuses
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Box>
      {orderedStatuses.length === 0 ? (
        <Alert severity="info" sx={{ textAlign: "left" }}>
          <Box>No statuses added yet. Add a status to style matching note markers.</Box>
        </Alert>
      ) : (
        <Box
          sx={{
            maxHeight: "100vh",
            overflowY: "auto",
            minHeight: 0,
            bgcolor: colors.blueGrey[900],
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <TableContainer sx={{ overflow: "hidden" }}>
            <Table size="small" sx={{ borderCollapse: "collapse", borderSpacing: 0 }}>
              <TableBody>
                {orderedStatuses.map((status) => (
                  <StatusListRow
                    key={status.id}
                    status={status}
                    isNewStatus={status.id === newStatusId}
                    onOpenMenu={handleOpenMenu}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
      <Menu
        anchorEl={menuState.anchorEl}
        open={Boolean(menuState.anchorEl)}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={handleMenuEdit}>
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", mr: 1, py: 1, px: 0.5 }}>
            <Icon path={mdiPencil} size={0.7} />
          </Box>
          Edit
        </MenuItem>
        <MenuItem onClick={handleMenuDelete}>
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", mr: 1, py: 1, px: 0.5 }}>
            <Icon path={mdiTrashCanOutline} size={0.7} />
          </Box>
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default StatusList;
