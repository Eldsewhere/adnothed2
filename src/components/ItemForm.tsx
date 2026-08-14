import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Box,
  colors,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import { Icon } from "@mdi/react";
import type { Category, Item, ItemFormValues } from "../types";
import {
  mdiCancel,
  mdiCheckboxBlankOutline,
  mdiCheckCircle,
  mdiChevronDown,
  mdiCircleSmall,
  mdiContentPaste,
  mdiFormatListBulleted,
  mdiLabelMultiple,
  mdiLabelOff,
} from "@mdi/js";
import LabelIcon from "./LabelIcon";
import { NO_CATEGORY_FILTER_VALUE } from "../utils/itemFilters";

type ItemFormProps = {
  editingItem: Item | null;
  initialText?: string;
  categories: Category[];
  onSubmit: (values: ItemFormValues) => void;
  onCancelEdit: () => void;
  onFilterTextChange: (value: string) => void;
  onFilterCategoryChange: (value: string) => void;
};

const emptyValues: ItemFormValues = { categoryId: "", text: "" };

const ItemForm = ({
  editingItem,
  initialText,
  categories,
  onSubmit,
  onCancelEdit,
  onFilterTextChange,
  onFilterCategoryChange,
}: ItemFormProps) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ItemFormValues>({
    defaultValues: initialText
      ? { categoryId: "", text: initialText }
      : emptyValues,
  });
  const [labelMenuAnchor, setLabelMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [formatMenuAnchor, setFormatMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const nextValues = editingItem
      ? { categoryId: editingItem.categoryId ?? "", text: editingItem.text }
      : initialText
        ? { categoryId: "", text: initialText }
        : emptyValues;

    reset(nextValues);
    onFilterTextChange(nextValues.text);
    onFilterCategoryChange(nextValues.categoryId ? nextValues.categoryId : "");
  }, [
    editingItem,
    initialText,
    onFilterCategoryChange,
    onFilterTextChange,
    reset,
  ]);

  const submit = handleSubmit((values) => {
    onSubmit(values);
    reset(emptyValues);
    onFilterTextChange("");
    onFilterCategoryChange("");
  });

  const openLabelMenu = (event: MouseEvent<HTMLElement>) => {
    setLabelMenuAnchor(event.currentTarget);
  };

  const closeLabelMenu = () => {
    setLabelMenuAnchor(null);
  };

  const insertMarker = (
    marker: string,
    currentValue: string,
    onChange: (value: string) => void,
  ) => {
    const el = textAreaRef.current;
    const start = el?.selectionStart ?? currentValue.length;
    const end = el?.selectionEnd ?? currentValue.length;
    const existingMarker = /^(•|\[\])\s*/;

    if (start !== end) {
      const lineStart = currentValue.lastIndexOf("\n", start - 1) + 1;
      const lineEndIndex = currentValue.indexOf("\n", end);
      const lineEnd = lineEndIndex === -1 ? currentValue.length : lineEndIndex;

      const before = currentValue.slice(0, lineStart);
      const after = currentValue.slice(lineEnd);
      const selectedLines = currentValue.slice(lineStart, lineEnd).split("\n");
      const alreadyApplied = selectedLines.every((line) =>
        line.startsWith(`${marker} `),
      );

      const nextLines = selectedLines
        .map((line) =>
          alreadyApplied
            ? line.replace(existingMarker, "")
            : `${marker} ${line.replace(existingMarker, "")}`,
        )
        .join("\n");

      const nextValue = before + nextLines + after;
      onChange(nextValue);

      requestAnimationFrame(() => {
        if (!el) {
          return;
        }
        el.focus();
        el.setSelectionRange(before.length, before.length + nextLines.length);
      });
      return;
    }

    const isAtEnd = start === currentValue.length;
    const needsNewline =
      isAtEnd && currentValue[start - 1] !== "\n" && currentValue.length > 0;
    const snippet = `${needsNewline ? "\n" : ""}${marker} `;
    const nextValue =
      currentValue.slice(0, start) + snippet + currentValue.slice(start);
    onChange(nextValue);

    requestAnimationFrame(() => {
      if (!el) {
        return;
      }
      const cursor = start + snippet.length;
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <Stack
        direction="row"
        sx={{ alignItems: "flex-start", flexWrap: "wrap", gap: 1 }}
      >
        <Stack direction="row" sx={{ alignItems: "center", width: "100%" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Controller
              name="text"
              control={control}
              rules={{
                required: "Note is required",
                maxLength: { value: 500, message: "Max 500 characters" },
              }}
              render={({ field }) => {
                const handleTextChange = (value: string) => {
                  field.onChange(value);
                  onFilterTextChange(value);
                };

                return (
                  <Box sx={{ position: "relative" }}>
                    <TextField
                      {...field}
                      value={field.value}
                      onChange={(event) => {
                        handleTextChange(event.target.value);
                      }}
                      inputRef={(el: HTMLTextAreaElement | null) => {
                        textAreaRef.current = el;
                      }}
                      label="Note"
                      size="small"
                      fullWidth
                      autoFocus
                      multiline
                      minRows={2.2}
                      error={!!errors.text}
                      helperText={errors.text?.message}
                      sx={{
                        "& .MuiInputBase-inputMultiline": {
                          pb: 4,
                        },
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
                    <Tooltip title="Actions">
                      <IconButton
                        aria-label="Open text actions"
                        size="small"
                        onClick={(event: MouseEvent<HTMLElement>) =>
                          setFormatMenuAnchor(event.currentTarget)
                        }
                        sx={{
                          position: "absolute",
                          right: 6,
                          bottom: errors.text ? 24 : 6,
                          color: colors.blueGrey[400],
                        }}
                      >
                        <Icon path={mdiFormatListBulleted} size={0.8} />
                      </IconButton>
                    </Tooltip>
                    <Menu
                      anchorEl={formatMenuAnchor}
                      open={Boolean(formatMenuAnchor)}
                      onClose={() => setFormatMenuAnchor(null)}
                    >
                      <MenuItem
                        onClick={() => {
                          insertMarker("•", field.value, handleTextChange);
                          setFormatMenuAnchor(null);
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            mr: 1,
                          }}
                        >
                          <Icon path={mdiCircleSmall} size={0.9} />
                        </Box>
                        Bullet
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          insertMarker("[]", field.value, handleTextChange);
                          setFormatMenuAnchor(null);
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            mr: 1,
                          }}
                        >
                          <Icon path={mdiCheckboxBlankOutline} size={0.75} />
                        </Box>
                        Checkbox
                      </MenuItem>
                      <MenuItem
                        onClick={async () => {
                          const text = await navigator.clipboard.readText();
                          handleTextChange(field.value + text);
                          setFormatMenuAnchor(null);
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            mr: 1,
                          }}
                        >
                          <Icon path={mdiContentPaste} size={0.75} />
                        </Box>
                        Paste
                      </MenuItem>
                    </Menu>
                  </Box>
                );
              }}
            />
          </Box>
          <Stack
            sx={{
              alignItems: "center",
              justifyContent: "center",
              ml: 1,
              gap: 1,
            }}
          >
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => {
                const activeCategoryId = field.value;
                const selectedCategory = categories.find(
                  (category) => category.id === activeCategoryId,
                );

                return (
                  <>
                    <Tooltip
                      title={
                        selectedCategory
                          ? selectedCategory.name
                          : "Assign a label"
                      }
                      arrow
                    >
                      <IconButton
                        aria-label="Choose label"
                        size="small"
                        onClick={openLabelMenu}
                        sx={{
                          color: selectedCategory
                            ? "inherit"
                            : colors.blueGrey[500],
                          position: "relative",
                          pr: 1.25,
                        }}
                      >
                        {selectedCategory ? (
                          <LabelIcon
                            icon={selectedCategory.icon}
                            color={selectedCategory.color}
                            size={0.8}
                          />
                        ) : (
                          <Icon path={mdiLabelMultiple} size={0.8} />
                        )}
                        <Box
                          component="span"
                          sx={{
                            position: "absolute",
                            right: -2,
                            bottom: 2,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: colors.blueGrey[500],
                            lineHeight: 1,
                          }}
                        >
                          <Icon path={mdiChevronDown} size={0.6} />
                        </Box>
                      </IconButton>
                    </Tooltip>
                    <Menu
                      anchorEl={labelMenuAnchor}
                      open={Boolean(labelMenuAnchor)}
                      onClose={closeLabelMenu}
                    >
                      {categories.length > 0 && (
                        <MenuItem
                          autoFocus
                          onClick={() => {
                            field.onChange("");
                            onFilterCategoryChange("");
                            closeLabelMenu();
                          }}
                        >
                          <span>Show All</span>
                        </MenuItem>
                      )}
                      <MenuItem
                        selected={activeCategoryId === ""}
                        onClick={() => {
                          field.onChange("");
                          onFilterCategoryChange(NO_CATEGORY_FILTER_VALUE);
                          closeLabelMenu();
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            color: colors.blueGrey[300],
                          }}
                        >
                          <Icon path={mdiLabelOff} size={0.8} />
                          <span>
                            {categories.length == 0
                              ? "no labels available"
                              : "no label"}
                          </span>
                        </Box>
                      </MenuItem>
                      {categories.map((category) => (
                        <MenuItem
                          key={category.id}
                          autoFocus={activeCategoryId === category.id}
                          selected={activeCategoryId === category.id}
                          onClick={() => {
                            field.onChange(category.id);
                            onFilterCategoryChange(category.id);
                            closeLabelMenu();
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <LabelIcon
                              icon={category.icon}
                              color={category.color}
                              size={0.7}
                            />
                            <span>{category.name}</span>
                          </Box>
                        </MenuItem>
                      ))}
                    </Menu>
                  </>
                );
              }}
            />
            <Box sx={{ display: "flex", gap: 1 }}>
              <Tooltip title={editingItem ? "Update note" : "Add note"}>
                <IconButton
                  type="submit"
                  aria-label={editingItem ? "Update note" : "Add note"}
                  color={"primary"}
                  sx={{ color: colors.lightGreen[400] }}
                >
                  <Icon path={mdiCheckCircle} size={0.9} />
                </IconButton>
              </Tooltip>
              {editingItem && (
                <Tooltip title="Cancel edit">
                  <IconButton
                    onClick={() => {
                      onCancelEdit();
                      reset(emptyValues);
                      onFilterTextChange("");
                      onFilterCategoryChange("");
                    }}
                    aria-label="Cancel"
                    color={"primary"}
                  >
                    <Icon path={mdiCancel} size={0.9} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
};

export default ItemForm;
