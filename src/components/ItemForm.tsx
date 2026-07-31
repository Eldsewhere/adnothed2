import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Icon } from '@mdi/react';
import type { Category, Item, ItemFormValues } from '../types';

type ItemFormProps = {
  categories: Category[];
  editingItem: Item | null;
  onSubmit: (values: ItemFormValues) => void;
  onCancelEdit: () => void;
};

const emptyValues: ItemFormValues = { categoryId: '', text: '' };

const ItemForm = ({ categories, editingItem, onSubmit, onCancelEdit }: ItemFormProps) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ItemFormValues>({ defaultValues: emptyValues });

  useEffect(() => {
    reset(
      editingItem
        ? { categoryId: editingItem.categoryId ?? '', text: editingItem.text }
        : emptyValues,
    );
  }, [editingItem, reset]);

  const submit = handleSubmit((values) => {
    onSubmit(values);
    reset(emptyValues);
  });

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <Typography variant="h6" component="h2" gutterBottom>
        {editingItem ? 'Edit Item' : 'Add Item'}
      </Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: 'flex-start' }}
      >
        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              label="Category"
              size="small"
              error={!!errors.categoryId}
              helperText={errors.categoryId?.message}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="">No category</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  <Box
                    component="span"
                    sx={{ display: 'inline-flex', alignItems: 'center', mr: 1 }}
                  >
                    <Icon path={category.icon.path} size={0.8} />
                  </Box>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        <Controller
          name="text"
          control={control}
          rules={{ required: 'Text is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              label="Text"
              size="small"
              error={!!errors.text}
              helperText={errors.text?.message}
              sx={{ minWidth: 220 }}
            />
          )}
        />
        <Stack direction="row" spacing={1}>
          <Button type="submit" variant="contained">
            {editingItem ? 'Update' : 'Add'}
          </Button>
          {editingItem && (
            <Button
              type="button"
              variant="text"
              onClick={() => {
                onCancelEdit();
                reset(emptyValues);
              }}
            >
              Cancel
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};

export default ItemForm;
