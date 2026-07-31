import {
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Icon } from '@mdi/react';
import { mdiPencilOutline, mdiTrashCanOutline } from '@mdi/js';
import type { Category } from '../types';

type CategoryListProps = {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
};

const CategoryList = ({ categories, onEdit, onDelete }: CategoryListProps) => {
  return (
    <Box>
      <Typography variant="h6" component="h2" gutterBottom>
        Categories
      </Typography>
      {categories.length === 0 ? (
        <Typography color="text.secondary">No categories added yet.</Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Icon</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>
                    <Icon path={category.icon.path} size={1} />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      aria-label={`Edit ${category.name}`}
                      size="small"
                      onClick={() => onEdit(category)}
                    >
                      <Icon path={mdiPencilOutline} size={0.8} />
                    </IconButton>
                    <IconButton
                      aria-label={`Delete ${category.name}`}
                      size="small"
                      onClick={() => onDelete(category)}
                    >
                      <Icon path={mdiTrashCanOutline} size={0.8} />
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
