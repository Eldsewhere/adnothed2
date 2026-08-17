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
import type { Category } from "../types";
import LabelListRow from "./LabelListRow";

type LabelListProps = {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  newCategoryId?: string | null;
};

const LabelList = ({
  categories,
  onEdit,
  onDelete,
  newCategoryId,
}: LabelListProps) => {
  const [menuState, setMenuState] = useState<{
    anchorEl: HTMLElement | null;
    category: Category | null;
  }>({ anchorEl: null, category: null });

  const handleOpenMenu = (
    event: React.MouseEvent<HTMLElement>,
    category: Category,
  ) => {
    setMenuState({ anchorEl: event.currentTarget, category });
  };

  const handleCloseMenu = () => {
    setMenuState({ anchorEl: null, category: null });
  };

  const handleMenuEdit = () => {
    if (menuState.category) {
      onEdit(menuState.category);
    }
    handleCloseMenu();
  };

  const handleMenuDelete = () => {
    if (menuState.category) {
      onDelete(menuState.category);
    }
    handleCloseMenu();
  };

  const orderedCategories = categories
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Box>
      {orderedCategories.length === 0 ? (
        <Alert severity="info" sx={{ textAlign: "left" }}>
          <Box> No labels added yet</Box>
          <Box sx={{ mt: 0.5 }}>Add labels to filter notes together</Box>
          <Box sx={{ mt: 0.5 }}>
            Search icons by typing icon name from{" "}
            <a
              href="https://pictogrammers.com/library/mdi/"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://pictogrammers.com/library/mdi/
            </a>
          </Box>
          <Box sx={{ mt: 0.5 }}>Or use avatar text: A, AB, 0-99, or A0.</Box>
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
          <TableContainer sx={{ borderRadius: 2, overflow: "hidden" }}>
            <Table
              size="small"
              sx={{ borderCollapse: "collapse", borderSpacing: 0 }}
            >
              <TableBody>
                {orderedCategories.map((category) => (
                  <LabelListRow
                    key={category.id}
                    category={category}
                    isNewCategory={category.id === newCategoryId}
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
