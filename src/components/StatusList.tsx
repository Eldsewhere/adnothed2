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
import { mdiCheck, mdiPencil, mdiTrashCanOutline } from "@mdi/js";
import type { Note, Status } from "../types";
import StatusListRow from "./StatusListRow";

type StatusListProps = {
  statuses: Status[];
  notes: Note[];
  editingStatusId?: string | null;
  selectedStatusEmoji?: string | null;
  onEdit: (status: Status) => void;
  onDelete: (status: Status) => void;
  newStatusId?: string | null;
  onSelect?: (status: Status) => void;
};

const StatusList = ({
  statuses,
  notes,
  editingStatusId = null,
  selectedStatusEmoji = null,
  onEdit,
  onDelete,
  newStatusId,
  onSelect,
}: StatusListProps) => {
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

  const handleMenuSelect = () => {
    if (menuState.status && onSelect) {
      onSelect(menuState.status);
    }
    handleCloseMenu();
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
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {orderedStatuses.length === 0 ? (
        <Alert severity="info" sx={{ textAlign: "left" }}>
          <Box>
            No statuses added yet. Add a status to highlight or apply styles to
            notes.
          </Box>
        </Alert>
      ) : (
        <Box
          sx={{
            flex: 1,
            maxHeight: "calc(100vh - 220px)",
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarGutter: "auto",
            bgcolor: colors.blueGrey[900],
            borderRadius: 2,
            scrollbarWidth: "thin",
            "&::-webkit-scrollbar": {
              width: 8,
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "rgba(148, 163, 184, 0.45)",
              borderRadius: 999,
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "rgba(15, 23, 42, 0.2)",
            },
          }}
        >
          <TableContainer sx={{ overflow: "hidden" }}>
            <Table
              size="small"
              sx={{ borderCollapse: "collapse", borderSpacing: 0 }}
            >
              <TableBody>
                {orderedStatuses.map((status) => (
                  <StatusListRow
                    key={status.id}
                    status={status}
                    count={
                      notes.filter((note) => note.emoji === status.emoji).length
                    }
                    isNewStatus={status.id === newStatusId}
                    isEditing={status.id === editingStatusId}
                    isSelected={selectedStatusEmoji === status.emoji}
                    isMenuOpen={menuState.status?.id === status.id}
                    onOpenMenu={handleOpenMenu}
                    onSelect={onSelect}
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
        <MenuItem onClick={handleMenuSelect}>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
              py: 1,
              px: 0.5,
            }}
          >
            <Icon path={mdiCheck} size={0.7} />
          </Box>
          Select
        </MenuItem>
        <MenuItem onClick={handleMenuEdit}>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
              py: 1,
              px: 0.5,
            }}
          >
            <Icon path={mdiPencil} size={0.7} />
          </Box>
          Edit
        </MenuItem>
        <MenuItem onClick={handleMenuDelete}>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
              py: 1,
              px: 0.5,
            }}
          >
            <Icon path={mdiTrashCanOutline} size={0.7} />
          </Box>
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default StatusList;
