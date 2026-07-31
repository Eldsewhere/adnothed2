import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Autocomplete,
  Box,
  IconButton,
  Stack,
  TextField,
  createFilterOptions,
} from "@mui/material";
import { Icon } from "@mdi/react";
import useMdiIconOptions from "../hooks/useMdiIconOptions";
import type { Category, CategoryFormValues, IconOption } from "../types";
import { mdiCancel, mdiCheck } from "@mdi/js";

type CategoryFormProps = {
  editingCategory: Category | null;
  onSubmit: (values: CategoryFormValues & { icon: IconOption }) => void;
  onCancelEdit: () => void;
};

// Limit the number of rendered options so the list stays responsive even
// though the full @mdi/js icon set (thousands of icons) is searchable.
const filterOptions = createFilterOptions<IconOption>({
  limit: 100,
  stringify: (option) => option.label,
});

const emptyValues: CategoryFormValues = { name: "", icon: null };

const CategoryForm = ({
  editingCategory,
  onSubmit,
  onCancelEdit,
}: CategoryFormProps) => {
  const iconOptions = useMdiIconOptions();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({ defaultValues: emptyValues });

  useEffect(() => {
    reset(
      editingCategory
        ? { name: editingCategory.name, icon: editingCategory.icon }
        : emptyValues,
    );
  }, [editingCategory, reset]);

  const submit = handleSubmit((values) => {
    if (!values.icon) {
      return;
    }
    onSubmit({ ...values, icon: values.icon });
    reset(emptyValues);
  });

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={3}
        sx={{ alignItems: "flex-start", flexWrap: "wrap" }}
      >
        <Controller
          name="icon"
          control={control}
          rules={{ required: "Icon is required" }}
          render={({ field: { onChange, value, ...field } }) => (
            <Autocomplete
              {...field}
              value={value}
              onChange={(_event, newValue) => onChange(newValue)}
              options={iconOptions}
              filterOptions={filterOptions}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, val) => option.name === val.name}
              sx={{ minWidth: 160 }}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.name}>
                  <Box
                    component="span"
                    sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
                  >
                    <Icon path={option.path} size={0.9} />
                  </Box>
                  {option.label}
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Icon"
                  size="small"
                  error={!!errors.icon}
                  helperText={errors.icon?.message}
                />
              )}
            />
          )}
        />
        <Controller
          name="name"
          control={control}
          rules={{ required: "Name is required" }}
          render={({ field }) => (
            <TextField
              {...field}
              label="Name"
              size="small"
              error={!!errors.name}
              helperText={errors.name?.message}
              sx={{ minWidth: 160 }}
            />
          )}
        />
        <Box sx={{ display: "flex", gap: 1, ml: { sm: 1 } }}>
          <IconButton
            type="submit"
            aria-label="Toggle select mode"
            color={"primary"}
          >
            <Icon path={mdiCheck} size={0.9} />
          </IconButton>
          {editingCategory && (
            <IconButton
              aria-label="Toggle select mode"
              color={"primary"}
              onClick={() => {
                onCancelEdit();
                reset(emptyValues);
              }}
            >
              <Icon path={mdiCancel} size={0.9} />
            </IconButton>
          )}
        </Box>
      </Stack>
    </Box>
  );
};

export default CategoryForm;
