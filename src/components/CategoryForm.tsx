import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Autocomplete,
  Box,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  colors,
  createFilterOptions,
} from "@mui/material";
import useMdiIconOptions from "../hooks/useMdiIconOptions";
import type { Category, CategoryFormValues, IconOption } from "../types";
import { mdiCancel, mdiCheckCircle } from "@mdi/js";
import { Icon } from "@mdi/react";
import LabelIcon from "./LabelIcon";
import { createLetterIconOptionFromInput } from "../utils/letterIconOptions";
import { LABEL_COLOR_OPTIONS, getLabelColorSwatch } from "../utils/labelColors";

type CategoryFormProps = {
  editingCategory: Category | null;
  onSubmit: (
    values: CategoryFormValues & { icon: IconOption },
  ) => boolean | void;
  onCancelEdit: () => void;
};

// Limit the number of rendered options so the list stays responsive even
// though the full @mdi/js icon set (thousands of icons) is searchable.
const baseFilterOptions = createFilterOptions<IconOption>({
  limit: 100,
  stringify: (option) => option.label,
});

const emptyValues: CategoryFormValues = { name: "", icon: null, color: "" };

const ColorDot = ({ colorName }: { colorName?: string }) => (
  <Box
    component="span"
    sx={{
      width: 15,
      height: 15,
      borderRadius: "50%",
      flexShrink: 0,
      bgcolor: colorName
        ? getLabelColorSwatch(colorName).background
        : "white",
    }}
  />
);

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
    watch,
    formState: { errors },
  } = useForm<CategoryFormValues>({ defaultValues: emptyValues });
  const selectedColor = watch("color");

  useEffect(() => {
    reset(
      editingCategory
        ? {
            name: editingCategory.name,
            icon: editingCategory.icon,
            color: editingCategory.color ?? "",
          }
        : emptyValues,
    );
  }, [editingCategory, reset]);

  const submit = handleSubmit((values) => {
    if (!values.icon) {
      return;
    }
    const result = onSubmit({
      ...values,
      icon: values.icon,
      color: values.color || undefined,
    });
    if (result !== false) {
      reset(emptyValues);
    }
  });

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <Stack direction="column" sx={{ gap: 1, width: "100%" }}>
        <Controller
          name="color"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              value={field.value ?? ""}
              displayEmpty
              size="small"
              fullWidth
              renderValue={(selected) => (
                <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                  <ColorDot colorName={selected || undefined} />
                  {selected || "No color"}
                </Stack>
              )}
              sx={{
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: colors.blueGrey[500],
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: colors.blueGrey[500],
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: colors.blueGrey[500],
                },
              }}
            >
              <MenuItem value="">
                <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                  <ColorDot />
                  No color
                </Stack>
              </MenuItem>
              {LABEL_COLOR_OPTIONS.map((colorName) => (
                <MenuItem key={colorName} value={colorName}>
                  <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                    <ColorDot colorName={colorName} />
                    {colorName}
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          )}
        />
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
              filterOptions={
                iconInputValue
                  ? (options, state) => {
                      const filtered = baseFilterOptions(options, state);
                      const letterOption = createLetterIconOptionFromInput(
                        state.inputValue,
                      );
                      if (
                        letterOption &&
                        !filtered.some(
                          (option) => option.name === letterOption.name,
                        )
                      ) {
                        filtered.unshift(letterOption);
                      }
                      return filtered;
                    }
                  : (options) => options
              }
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, val) => option.name === val.name}
              sx={{ width: "100%" }}
              slotProps={{
                paper: {
                  sx: !iconInputValue
                    ? {
                        "& .MuiAutocomplete-listbox": {
                          display: "inline-flex",
                          justifyContent: "center",
                          flexWrap: "wrap",
                          backgroundColor: colors.blueGrey[900],
                        },
                      }
                    : undefined,
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
                      <LabelIcon
                        icon={option}
                        size={0.9}
                        color={selectedColor || undefined}
                      />
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
                    <LabelIcon
                      icon={option}
                      size={0.9}
                      color={selectedColor || undefined}
                    />
                  </Box>
                )
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search icon or use A, AB, 0-99, A0"
                  size="small"
                  error={!!errors.icon}
                  helperText={errors.icon?.message}
                  slotProps={{
                    ...params.slotProps,
                    input: {
                      ...params.slotProps.input,
                      startAdornment: value ? (
                        <LabelIcon
                          icon={value}
                          size={0.9}
                          color={selectedColor || undefined}
                        />
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
            rules={{
              required: "Label name is required",
              maxLength: { value: 15, message: "Max 15 characters" },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Label name"
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
            <Tooltip title={editingCategory ? "Update label" : "Add label"}>
              <span>
                <IconButton
                  type="submit"
                  aria-label="Add label"
                  color={"primary"}
                  sx={{ color: colors.lightGreen[400] }}
                >
                  <Icon path={mdiCheckCircle} size={0.9} />
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
