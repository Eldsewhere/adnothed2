import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Autocomplete,
  Box,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  colors,
  createFilterOptions,
} from "@mui/material";
import { Icon } from "@mdi/react";
import useMdiIconOptions from "../hooks/useMdiIconOptions";
import type { Category, CategoryFormValues, IconOption } from "../types";
import { mdiCancel, mdiCheckCircleOutline } from "@mdi/js";

type CategoryFormProps = {
  editingCategory: Category | null;
  onSubmit: (
    values: CategoryFormValues & { icon: IconOption },
  ) => boolean | void;
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
  const [iconInputValue, setIconInputValue] = useState("");
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
    const result = onSubmit({ ...values, icon: values.icon });
    if (result !== false) {
      reset(emptyValues);
    }
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
              inputValue={iconInputValue}
              onInputChange={(_event, newInputValue) =>
                setIconInputValue(newInputValue)
              }
              options={iconOptions}
              filterOptions={iconInputValue ? filterOptions : (x) => x}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, val) => option.name === val.name}
              sx={{ width: "100%" }}
              slotProps={{
                paper: {
                  sx: !iconInputValue? {
                    "& .MuiAutocomplete-listbox": {
                      display: "inline-flex",
                      justifyContent: "center",
                      flexWrap: "wrap",
                      backgroundColor: colors.blueGrey[900],
                    },
                  } : undefined,
                },
              }}
              renderOption={(props, option) =>
                iconInputValue ? (
                  <Box component="li" {...props} key={option.name}>
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        mr: 1,
                      }}
                    >
                      <Icon path={option.path} size={0.9} />
                    </Box>
                    {option.label}
                  </Box>
                ) : (
                  <Box
                    component="li"
                    {...props}
                    key={option.name}
                    sx={{
                      display: "inline-flex !important",
                      px: "0.7rem !important",
                    }}
                  >
                    <Icon path={option.path} size={0.9} />
                  </Box>
                )
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search icon"
                  size="small"
                  error={!!errors.icon}
                  helperText={errors.icon?.message}
                  slotProps={{
                    ...params.slotProps,
                    input: {
                      ...params.slotProps.input,
                      startAdornment: value?.path ? (
                        <Icon path={value.path} size={0.9} />
                      ) : null,
                    },
                  }}
                  fullWidth
                  sx={{
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                      {
                        borderColor: colors.blueGrey[500],
                      },
                    "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                      {
                        borderColor: colors.blueGrey[500],
                      },
                    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                      {
                        borderColor: colors.blueGrey[500],
                      },
                  }}
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
            rules={{ required: "Label name is required" }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Label"
                size="small"
                error={!!errors.name}
                helperText={errors.name?.message}
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    borderColor: colors.blueGrey[500],
                  },
                  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                    {
                      borderColor: colors.blueGrey[500],
                    },
                  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                    {
                      borderColor: colors.blueGrey[500],
                    },
                }}
              />
            )}
          />
          <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
            <Tooltip title={editingCategory ? "Update label" : "Save label"}>
              <span>
                <IconButton
                  type="submit"
                  aria-label="Save label"
                  color={"primary"}
                >
                  <Icon path={mdiCheckCircleOutline} size={0.9} />
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
