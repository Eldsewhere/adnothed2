import {
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
} from "@mui/material";
import { Icon } from "@mdi/react";
import { mdiPencilOutline, mdiTrashCanOutline } from "@mdi/js";
import type { Category } from "../types";

type CategoryListProps = {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
};

const CategoryList = ({ categories, onEdit, onDelete }: CategoryListProps) => {
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
                    <Icon path={category.icon.path} size={1} />
                  </TableCell>
                  <TableCell sx={{ pl: 0 }}>{category.name}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      aria-label={`Edit ${category.name}`}
                      size="small"
                      onClick={() => onEdit(category)}
                    >
                      <Icon path={mdiPencilOutline} size={0.8} />
                    </IconButton>
                    <IconButton
                      aria-label="Toggle select mode"
                      color={"primary"}
                      onClick={() => onDelete(category)}
                    >
                      <Icon path={mdiTrashCanOutline} size={0.9} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default CategoryList;
