import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { Icon } from '@mdi/react';
import type { Category, Item, ItemFormValues } from '../types';
import { mdiCheck } from '@mdi/js';

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
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={3}
        sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}
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
              sx={{ minWidth: 160 }}
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
              sx={{ minWidth: 160 }}
            />
          )}
        />
        <Box sx={{ display: 'flex', gap: 1, ml: { sm: 1 } }}>
          <IconButton
            type="submit"
            aria-label="Toggle select mode"
            color={"primary"}
          >
            <Icon path={mdiCheck} size={0.9} />
          </IconButton>
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
        </Box>
      </Stack>
    </Box>
  );
};

export default ItemForm;
