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
import type { Label } from "../types";
import LabelListRow from "./LabelListRow";

type LabelListProps = {
  labels: Label[];
  editingLabelId?: string | null;
  onEdit: (label: Label) => void;
  onDelete: (label: Label) => void;
  newlabelId?: string | null;
};

const LabelList = ({
  labels,
  editingLabelId = null,
  onEdit,
  onDelete,
  newlabelId,
}: LabelListProps) => {
  const [menuState, setMenuState] = useState<{
    anchorEl: HTMLElement | null;
    label: Label | null;
  }>({ anchorEl: null, label: null });

  const handleOpenMenu = (
    event: React.MouseEvent<HTMLElement>,
    label: Label,
  ) => {
    setMenuState({ anchorEl: event.currentTarget, label });
  };

  const handleCloseMenu = () => {
    setMenuState({ anchorEl: null, label: null });
  };

  const handleMenuEdit = () => {
    if (menuState.label) {
      onEdit(menuState.label);
    }
    handleCloseMenu();
  };

  const handleMenuDelete = () => {
    if (menuState.label) {
      onDelete(menuState.label);
    }
    handleCloseMenu();
  };

  const orderedLabels = labels
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Box>
      {orderedLabels.length === 0 ? (
        <Alert severity="info" sx={{ textAlign: "left" }}>
          <Box> No labels added yet. Add labels to filter notes together</Box>
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
          <TableContainer
            sx={{
              overflow: "hidden",
            }}
          >
            <Table
              size="small"
              sx={{ borderCollapse: "collapse", borderSpacing: 0 }}
            >
              <TableBody>
                {orderedLabels.map((label) => (
                  <LabelListRow
                    key={label.id}
                    label={label}
                    isNewLabel={label.id === newlabelId}
                    isEditing={label.id === editingLabelId}
                    isMenuOpen={menuState.label?.id === label.id}
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

export default LabelList;
