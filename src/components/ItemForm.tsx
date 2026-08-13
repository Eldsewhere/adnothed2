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
  mdiNoteText,
} from "@mdi/js";
import LabelIcon from "./LabelIcon";

type ItemFormProps = {
  editingItem: Item | null;
  initialText?: string;
  categories: Category[];
  onSubmit: (values: ItemFormValues) => void;
  onCancelEdit: () => void;
};

const emptyValues: ItemFormValues = { categoryId: "", text: "" };

const ItemForm = ({
  editingItem,
  initialText,
  categories,
  onSubmit,
  onCancelEdit,
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
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    reset(
      editingItem
        ? { categoryId: editingItem.categoryId ?? "", text: editingItem.text }
        : initialText
          ? { categoryId: "", text: initialText }
          : emptyValues,
    );
  }, [editingItem, initialText, reset]);

  const submit = handleSubmit((values) => {
    onSubmit(values);
    reset(emptyValues);
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
    const needsNewline = isAtEnd && currentValue[start - 1] !== "\n" && currentValue.length > 0;
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
                return (
                  <Box sx={{ position: "relative" }}>
                    <TextField
                      {...field}
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
                    <Tooltip title="Insert bullet">
                      <IconButton
                        aria-label="Insert bullet"
                        size="small"
                        onClick={() =>
                          insertMarker("•", field.value, field.onChange)
                        }
                        sx={{
                          position: "absolute",
                          right: 70,
                          bottom: errors.text ? 24 : 6,
                          color: colors.blueGrey[400],
                        }}
                      >
                        <Icon path={mdiCircleSmall} size={0.9} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Insert checkbox">
                      <IconButton
                        aria-label="Insert checkbox"
                        size="small"
                        onClick={() =>
                          insertMarker("[]", field.value, field.onChange)
                        }
                        sx={{
                          position: "absolute",
                          right: 38,
                          bottom: errors.text ? 24 : 6,
                          color: colors.blueGrey[400],
                        }}
                      >
                        <Icon path={mdiCheckboxBlankOutline} size={0.75} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Paste text">
                      <IconButton
                        aria-label="Paste text"
                        size="small"
                        onClick={async () => {
                          const text = await navigator.clipboard.readText();
                          field.onChange(field.value + text);
                        }}
                        sx={{
                          position: "absolute",
                          right: 6,
                          bottom: errors.text ? 24 : 6,
                          color: colors.blueGrey[400],
                        }}
                      >
                        <Icon path={mdiContentPaste} size={0.75} />
                      </IconButton>
                    </Tooltip>
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
                const selectedCategory = categories.find(
                  (category) => category.id === field.value,
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
                          <Icon path={mdiNoteText} size={0.8} />
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
                      <MenuItem
                        autoFocus={field.value === ""}
                        selected={field.value === ""}
                        onClick={() => {
                          field.onChange("");
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
                          <Icon path={mdiNoteText} size={0.8} />
                          <span>
                            {categories.length === 0
                              ? "No labels available"
                              : "No label"}
                          </span>
                        </Box>
                      </MenuItem>
                      {categories.map((category) => (
                        <MenuItem
                          key={category.id}
                          autoFocus={field.value === category.id}
                          selected={field.value === category.id}
                          onClick={() => {
                            field.onChange(category.id);
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
