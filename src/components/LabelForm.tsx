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
import type { Label, LabelFormValues, IconOption } from "../types";
import { mdiCancel, mdiCheckCircle } from "@mdi/js";
import { Icon } from "@mdi/react";
import LabelIcon from "./ui/LabelIcon";
import { createLetterIconOptionFromInput } from "../utils/letterIconOptions";
import { LABEL_COLOR_OPTIONS, getLabelColorSwatch } from "../utils/labelColors";

type LabelFormProps = {
  editingLabel: Label | null;
  onSubmit: (values: LabelFormValues & { icon: IconOption }) => boolean | void;
  onCancelEdit: () => void;
};

// Limit the number of rendered options so the list stays responsive even
// though the full @mdi/js icon set (thousands of icons) is searchable.
const baseFilterOptions = createFilterOptions<IconOption>({
  limit: 100,
  stringify: (option) => option.label,
});

const emptyValues: LabelFormValues = { name: "", icon: null, color: "" };

const ColorDot = ({ colorName }: { colorName?: string }) => (
  <Box
    component="span"
    sx={{
      width: 15,
      height: 15,
      borderRadius: "50%",
      flexShrink: 0,
      bgcolor: colorName ? getLabelColorSwatch(colorName).background : "white",
    }}
  />
);

const LabelForm = ({
  editingLabel,
  onSubmit,
  onCancelEdit,
}: LabelFormProps) => {
  const iconOptions = useMdiIconOptions();
  const [iconInputValue, setIconInputValue] = useState("");
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<LabelFormValues>({ defaultValues: emptyValues });
  const selectedColor = watch("color");

  useEffect(() => {
    reset(
      editingLabel
        ? {
            name: editingLabel.name,
            icon: editingLabel.icon,
            color: editingLabel.color ?? "",
          }
        : emptyValues,
    );
  }, [editingLabel, reset]);

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
    <Box component="form" onSubmit={submit} noValidate sx={{ mb: 2 }}>
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
              aria-label="Label color"
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
          render={({ field: { onChange, value, ...field } }) => {
            return (
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
            );
          }}
        />
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
              slotProps={{
                input: {
                  endAdornment: (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        mr: 0.5,
                        ml: 1,
                      }}
                    >
                      {editingLabel && (
                        <Tooltip title="Cancel edit">
                          <span>
                            <IconButton
                              aria-label="Cancel edit"
                              size="small"
                              onClick={() => {
                                onCancelEdit();
                                reset(emptyValues);
                              }}
                              sx={{
                                color: colors.red[400],
                                border: "none",
                                backgroundColor: "transparent",
                                borderRadius: 1,
                                minWidth: 32,
                                width: 32,
                                height: 32,
                                p: 0,
                                boxShadow: "none",
                                "&:hover": {
                                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                                },
                              }}
                            >
                              <Icon
                                path={mdiCancel}
                                size={0.8}
                                color={colors.red[400]}
                              />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                      <Tooltip
                        title={editingLabel ? "Update label" : "Add label"}
                      >
                        <span>
                          <IconButton
                            type="submit"
                            aria-label={
                              editingLabel ? "Update label" : "Add label"
                            }
                            size="small"
                            sx={{
                              color: colors.lightGreen[400],
                              border: "none",
                              backgroundColor: "transparent",
                              borderRadius: 1,
                              minWidth: 32,
                              width: 32,
                              height: 32,
                              p: 0,
                              boxShadow: "none",
                              "&:hover": {
                                backgroundColor: "rgba(74, 222, 128, 0.12)",
                              },
                            }}
                          >
                            <Icon
                              path={mdiCheckCircle}
                              size={0.8}
                              color={colors.lightGreen[400]}
                            />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  ),
                },
              }}
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
                "& .MuiInputBase-root": {
                  pr: 0.5,
                },
                "& .MuiInputBase-input": {
                  pr: 0.5,
                },
              }}
            />
          )}
        />
      </Stack>
    </Box>
  );
};

export default LabelForm;
