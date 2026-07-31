import { useState, type MouseEvent } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { Icon } from '@mdi/react';
import { mdiContentCopy, mdiDotsVertical, mdiPencilOutline, mdiTrashCanOutline } from '@mdi/js';
import type { Category, Item, ItemFilters as ItemFiltersValue } from '../types';
import { formatDate, formatTimestamp } from '../utils/formatTimestamp';
import { emptyItemFilters, NO_CATEGORY_FILTER_VALUE } from '../utils/itemFilters';
import ItemFilters from './ItemFilters';

type ItemListProps = {
  items: Item[];
  categories: Category[];
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onCopy: (item: Item) => void;
};

const ItemList = ({ items, categories, onEdit, onDelete, onCopy }: ItemListProps) => {
  const [filters, setFilters] = useState<ItemFiltersValue>(emptyItemFilters);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; item: Item } | null>(null);
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const sortedItems = [...items].sort((a, b) => b.createdAt - a.createdAt);

  const closeMenu = () => setMenuAnchor(null);

  const handleEdit = (item: Item) => {
    onEdit(item);
    closeMenu();
  };

  const handleDelete = (item: Item) => {
    onDelete(item);
    closeMenu();
  };

  const handleCopy = (item: Item) => {
    onCopy(item);
    closeMenu();
  };

  const filteredItems = sortedItems.filter((item) => {
    if (filters.categoryId === NO_CATEGORY_FILTER_VALUE) {
      if (item.categoryId !== null) {
        return false;
      }
    } else if (filters.categoryId && item.categoryId !== filters.categoryId) {
      return false;
    }
    if (filters.text && !item.text.toLowerCase().includes(filters.text.toLowerCase())) {
      return false;
    }
    if (filters.date && !formatDate(item.createdAt).startsWith(filters.date.trim())) {
      return false;
    }
    return true;
  });

  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Items
        </Typography>
        <ItemFilters categories={categories} filters={filters} onChange={setFilters} />
      </Stack>
      {filteredItems.length === 0 ? (
        <Typography color="text.secondary">
          {sortedItems.length === 0 ? 'No items added yet.' : 'No items match the current filters.'}
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cat</TableCell>
                <TableCell>Text</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.map((item) => {
                const category = item.categoryId ? categoriesById.get(item.categoryId) : undefined;
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      {category ? (
                        <Tooltip title={category.name}>
                          <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                            <Icon path={category.icon.path} size={0.8} />
                          </Box>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary" component="span">
                          N/A
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography component="div">{item.text}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTimestamp(item.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        aria-label={`Actions for ${item.text}`}
                        size="small"
                        onClick={(event: MouseEvent<HTMLElement>) =>
                          setMenuAnchor({ el: event.currentTarget, item })
                        }
                      >
                        <Icon path={mdiDotsVertical} size={0.8} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Menu anchorEl={menuAnchor?.el} open={!!menuAnchor} onClose={closeMenu}>
        <MenuItem onClick={() => menuAnchor && handleEdit(menuAnchor.item)}>
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', mr: 1 }}>
            <Icon path={mdiPencilOutline} size={0.7} />
          </Box>
          Edit
        </MenuItem>
        <MenuItem onClick={() => menuAnchor && handleCopy(menuAnchor.item)}>
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', mr: 1 }}>
            <Icon path={mdiContentCopy} size={0.7} />
          </Box>
          Copy
        </MenuItem>
        <MenuItem onClick={() => menuAnchor && handleDelete(menuAnchor.item)}>
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', mr: 1 }}>
            <Icon path={mdiTrashCanOutline} size={0.7} />
          </Box>
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ItemList;
