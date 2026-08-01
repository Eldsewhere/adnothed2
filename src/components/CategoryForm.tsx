import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Autocomplete,
  Box,
  IconButton,
  Stack,
  TextField,
  Tooltip,
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
      <Stack direction="column" sx={{ gap: 1, width: "100%" }}>
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
              sx={{ width: "100%" }}
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
                  fullWidth
                />
              )}
            />
          )}
        />
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            gap: 1,
            width: "100%",
            flexWrap: "nowrap",
          }}
        >
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
                fullWidth
              />
            )}
          />
          <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
            <Tooltip title={editingCategory ? "Update group" : "Save group"}>
              <span>
                <IconButton
                  type="submit"
                  aria-label="Save group"
                  color={"primary"}
                >
                  <Icon path={mdiCheck} size={0.9} />
                </IconButton>
              </span>
            </Tooltip>
            {editingCategory && (
              <Tooltip title="Cancel edit">
                <span>
                  <IconButton
                    aria-label="Cancel edit"
                    color={"primary"}
                    onClick={() => {
                      onCancelEdit();
                      reset(emptyValues);
                    }}
                  >
                    <Icon path={mdiCancel} size={0.9} />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
};

export default CategoryForm;
