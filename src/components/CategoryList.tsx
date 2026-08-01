import { useState } from "react";
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { Icon } from "@mdi/react";
import { mdiDotsVertical, mdiPencilOutline, mdiTrashCanOutline } from "@mdi/js";
import type { Category } from "../types";

type CategoryListProps = {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
};

const CategoryList = ({ categories, onEdit, onDelete }: CategoryListProps) => {
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

  return (
    <Box>
      {categories.length === 0 ? (
        <Typography color="text.secondary">No categories added yet.</Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell sx={{ pr: 1, flexShrink: 0, width: 60 }}>
                    <Tooltip title={category.icon.name}>
                      <span>
                        <Icon path={category.icon.path} size={1} />
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ pl: 0 }}>{category.name}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="More options">
                      <span>
                        <IconButton
                          aria-label={`Open actions for ${category.name}`}
                          size="small"
                          onClick={(event) => handleOpenMenu(event, category)}
                        >
                          <Icon path={mdiDotsVertical} size={0.8} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
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
            sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
          >
            <Icon path={mdiPencilOutline} size={0.7} />
          </Box>
          Edit
        </MenuItem>
        <MenuItem onClick={handleMenuDelete}>
          <Box
            component="span"
            sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
          >
            <Icon path={mdiTrashCanOutline} size={0.7} />
          </Box>
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default CategoryList;
