import { useState } from "react";
import {
  Alert,
  Box,
  colors,
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
import { mdiDotsVertical, mdiPencil, mdiTrashCan } from "@mdi/js";
import type { Category } from "../types";
import LabelIcon from "./LabelIcon";

type CategoryListProps = {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  newCategoryId?: string | null;
};

const CategoryList = ({
  categories,
  onEdit,
  onDelete,
  newCategoryId,
}: CategoryListProps) => {
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
          <Box sx={{ mt: 0.5 }}>
            Or use avatar text: A, AB, 0-99, or A0.
          </Box>
        </Alert>
      ) : (
        <Box
          sx={{
            maxHeight: "calc(100vh - 280px)",
            overflowY: "auto",
            minHeight: 0,
            bgcolor: colors.blueGrey[900],
          }}
        >
          <TableContainer>
            <Table size="small">
              <TableBody>
                {orderedCategories.map((category, index) => (
                  <TableRow key={category.id}>
                    <TableCell
                      sx={{
                        paddingY: 2,
                        flexShrink: 0,
                        width: 40,
                        verticalAlign: "middle",
                        borderColor:
                          index < orderedCategories.length - 1
                            ? colors.blueGrey[700]
                            : "transparent",
                      }}
                    >
                      <Tooltip
                        title={category.icon.label}
                        aria-label={`Icon for ${category.name}`}
                      >
                        <LabelIcon icon={category.icon} size={1} />
                      </Tooltip>
                    </TableCell>
                    <TableCell
                      sx={{
                        paddingY: 2,
                        pl: 0,
                        maxWidth: 0,
                        width: "100%",
                        borderColor:
                          index < orderedCategories.length - 1
                            ? colors.blueGrey[700]
                            : "transparent",
                      }}
                    >
                      <Typography
                        noWrap
                        sx={{
                          color:
                            category.id === newCategoryId
                              ? colors.lightGreen[400]
                              : "inherit",
                        }}
                      >
                        {category.name}
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        verticalAlign: "middle",
                        paddingY: 2,
                        borderColor:
                          index < orderedCategories.length - 1
                            ? colors.blueGrey[700]
                            : "transparent",
                      }}
                    >
                      <Tooltip title="Actions">
                        <IconButton
                          aria-label={`Open actions for ${category.name}`}
                          size="small"
                          onClick={(event) => handleOpenMenu(event, category)}
                        >
                          <Icon path={mdiDotsVertical} size={0.8} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
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
            <Icon path={mdiTrashCan} size={0.7} />
          </Box>
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default CategoryList;
