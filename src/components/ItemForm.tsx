import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Box,
  colors,
  Divider,
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
  mdiCalendar,
  mdiCalendarEnd,
  mdiCalendarStart,
  mdiCancel,
  mdiCheckboxBlankOutline,
  mdiCheckCircle,
  mdiChevronDown,
  mdiChevronRight,
  mdiCircleSmall,
  mdiContentPaste,
  mdiEmailOutline,
  mdiFormatLineSpacing,
  mdiFormatListBulleted,
  mdiFormatListNumbered,
  mdiFormatText,
  mdiLabelMultiple,
  mdiLabelOff,
  mdiLinkVariant,
  mdiNumeric,
  mdiRayEndArrow,
  mdiRayStartArrow,
  mdiRayStartEnd,
  mdiSelectAll,
} from "@mdi/js";
import LabelIcon from "./LabelIcon";
import { NO_CATEGORY_FILTER_VALUE } from "../utils/itemFilters";

type ItemFormProps = {
  editingItem: Item | null;
  initialText?: string;
  categories: Category[];
  dueLabel?: string;
  onSubmit: (values: ItemFormValues) => void;
  onCancelEdit: () => void;
  onFilterTextChange: (value: string) => void;
  onFilterCategoryChange: (value: string) => void;
  onNoteTextChange?: (value: string) => void;
};

const emptyValues: ItemFormValues = { categoryId: "", text: "" };

type QueryTemplate = {
  label: string;
  command: string;
  placeholder?: string;
  iconPath: string;
};

const queryTemplates: QueryTemplate[] = [
  {
    label: "indexAt",
    command: "/index: number;",
    placeholder: "number",
    iconPath: mdiFormatListNumbered,
  },
  {
    label: "words",
    command: "/word: number;",
    placeholder: "number",
    iconPath: mdiFormatText,
  },
  {
    label: "lines",
    command: "/lines: number;",
    placeholder: "number",
    iconPath: mdiFormatLineSpacing,
  },
  {
    label: "exact",
    command: "/length: number;",
    placeholder: "number",
    iconPath: mdiRayStartEnd,
  },
  {
    label: "min",
    command: "/minlength: number;",
    placeholder: "number",
    iconPath: mdiRayStartArrow,
  },
  {
    label: "max",
    command: "/maxlength: number;",
    placeholder: "number",
    iconPath: mdiRayEndArrow,
  },
  {
    label: "exact",
    command: "/date: YYYY-MM-DD;",
    placeholder: "YYYY-MM-DD",
    iconPath: mdiCalendar,
  },
  {
    label: "min",
    command: "/mindate: YYYY-MM-DD;",
    placeholder: "YYYY-MM-DD",
    iconPath: mdiCalendarStart,
  },
  {
    label: "max",
    command: "/maxdate: YYYY-MM-DD;",
    placeholder: "YYYY-MM-DD",
    iconPath: mdiCalendarEnd,
  },
  { label: "numbers", command: "/with: numbers;", iconPath: mdiNumeric },
  { label: "URL", command: "/with: url;", iconPath: mdiLinkVariant },
  {
    label: "email",
    command: "/with: email;",
    iconPath: mdiEmailOutline,
  },
  {
    label: "bullets",
    command: "/with: bullets;",
    iconPath: mdiCircleSmall,
  },
  {
    label: "checkboxes",
    command: "/with: checkboxes;",
    iconPath: mdiCheckboxBlankOutline,
  },
  {
    label: "due date",
    command: "/with: due;",
    iconPath: mdiCalendar,
  },
];

const querySubmenuGroups: Record<
  "count" | "length" | "date" | "with",
  QueryTemplate[]
> = {
  count: [queryTemplates[1], queryTemplates[2]],
  length: [queryTemplates[3], queryTemplates[4], queryTemplates[5]],
  date: [queryTemplates[6], queryTemplates[7], queryTemplates[8]],
  with: [
    queryTemplates[9],
    queryTemplates[10],
    queryTemplates[11],
    queryTemplates[12],
    queryTemplates[13],
    queryTemplates[14],
  ],
};

const ItemForm = ({
  editingItem,
  initialText,
  categories,
  dueLabel,
  onSubmit,
  onCancelEdit,
  onFilterTextChange,
  onFilterCategoryChange,
  onNoteTextChange,
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
  const [queryMenuAnchor, setQueryMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [querySubmenuAnchor, setQuerySubmenuAnchor] =
    useState<HTMLElement | null>(null);
  const [querySubmenuKey, setQuerySubmenuKey] = useState<
    "count" | "length" | "date" | "with" | null
  >(null);
  const [querySubmenuOpenLeft, setQuerySubmenuOpenLeft] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const isEditing = editingItem !== null;

  useEffect(() => {
    const nextValues = editingItem
      ? { categoryId: editingItem.categoryId ?? "", text: editingItem.text }
      : initialText
        ? { categoryId: "", text: initialText }
        : emptyValues;

    reset(nextValues);
    onNoteTextChange?.(nextValues.text);
    if (!isEditing) {
      onFilterTextChange(nextValues.text);
      onFilterCategoryChange(
        nextValues.categoryId ? nextValues.categoryId : "",
      );
    }
  }, [
    editingItem,
    isEditing,
    initialText,
    onFilterCategoryChange,
    onFilterTextChange,
    onNoteTextChange,
    reset,
  ]);

  const submit = handleSubmit((values) => {
    onSubmit(values);
    reset(emptyValues);
    if (!isEditing) {
      onFilterTextChange("");
      onFilterCategoryChange("");
    }
  });

  const openLabelMenu = (event: MouseEvent<HTMLElement>) => {
    setLabelMenuAnchor(event.currentTarget);
  };

  const closeLabelMenu = () => {
    setLabelMenuAnchor(null);
  };

  const closeQueryMenu = () => {
    setQueryMenuAnchor(null);
    setQuerySubmenuAnchor(null);
    setQuerySubmenuKey(null);
    setQuerySubmenuOpenLeft(false);
  };

  const openQuerySubmenu = (
    event: MouseEvent<HTMLElement>,
    key: "count" | "length" | "date" | "with",
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const submenuWidth = 220;
    const canOpenLeft = rect.left > submenuWidth + 8;
    setQuerySubmenuAnchor(event.currentTarget);
    setQuerySubmenuKey(key);
    setQuerySubmenuOpenLeft(canOpenLeft);
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

  const prependQueryTemplate = (
    template: QueryTemplate,
    currentValue: string,
    onChange: (value: string) => void,
  ) => {
    const trimmedCurrent = currentValue.trimStart();
    const separator = "";
    const prefix = `${template.command}${separator}`;
    const nextValue = prefix + trimmedCurrent;
    onChange(nextValue);

    requestAnimationFrame(() => {
      const el = textAreaRef.current;
      if (!el) {
        return;
      }

      el.focus();
      if (!template.placeholder) {
        const cursor = template.command.length;
        el.setSelectionRange(cursor, cursor);
        return;
      }

      const placeholderStart = template.command.indexOf(template.placeholder);
      if (placeholderStart === -1) {
        const cursor = template.command.length;
        el.setSelectionRange(cursor, cursor);
        return;
      }
      const placeholderEnd = placeholderStart + template.placeholder.length;
      el.setSelectionRange(placeholderStart, placeholderEnd);
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
                  onNoteTextChange?.(value);
                  if (!isEditing) {
                    onFilterTextChange(value);
                  }
                };

                const noteFieldLabel = dueLabel
                  ? `Note, due ${dueLabel}`
                  : "Note";

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
                      label={noteFieldLabel}
                      placeholder={noteFieldLabel}
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
                      onClose={() => {
                        setFormatMenuAnchor(null);
                        closeQueryMenu();
                      }}
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
                      <Divider />
                      <MenuItem
                        onClick={() => {
                          setFormatMenuAnchor(null);
                          requestAnimationFrame(() => {
                            const el = textAreaRef.current;
                            if (!el) {
                              return;
                            }
                            el.focus();
                            el.setSelectionRange(0, field.value.length);
                          });
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
                          <Icon path={mdiSelectAll} size={0.75} />
                        </Box>
                        Select
                      </MenuItem>
                      <MenuItem
                        onClick={async () => {
                          const text = await navigator.clipboard.readText();
                          handleTextChange(field.value + text);
                          setFormatMenuAnchor(null);
                          closeQueryMenu();
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
                      <Divider />
                      <MenuItem
                        onClick={(event: MouseEvent<HTMLElement>) => {
                          setQueryMenuAnchor(event.currentTarget);
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
                          <Icon path={mdiChevronRight} size={0.75} />
                        </Box>
                        Query
                      </MenuItem>
                    </Menu>
                    <Menu
                      anchorEl={queryMenuAnchor}
                      open={Boolean(queryMenuAnchor)}
                      onClose={closeQueryMenu}
                      anchorOrigin={{ horizontal: "left", vertical: "top" }}
                      transformOrigin={{
                        horizontal: "left",
                        vertical: "top",
                      }}
                    >
                      <MenuItem
                        onClick={() => {
                          prependQueryTemplate(
                            queryTemplates[0],
                            field.value,
                            handleTextChange,
                          );
                          closeQueryMenu();
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
                          <Icon path={queryTemplates[0].iconPath} size={0.75} />
                        </Box>
                        {queryTemplates[0].label}
                      </MenuItem>
                      <MenuItem
                        onClick={(event) => openQuerySubmenu(event, "count")}
                      >
                        <Box
                          component="span"
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            mr: 1,
                          }}
                        >
                          <Icon path={mdiFormatText} size={0.75} />
                        </Box>
                        Count
                      </MenuItem>
                      <MenuItem
                        onClick={(event) => openQuerySubmenu(event, "length")}
                      >
                        <Box
                          component="span"
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            mr: 1,
                          }}
                        >
                          <Icon path={mdiRayStartEnd} size={0.75} />
                        </Box>
                        Length
                      </MenuItem>
                      <MenuItem
                        onClick={(event) => openQuerySubmenu(event, "date")}
                      >
                        <Box
                          component="span"
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            mr: 1,
                          }}
                        >
                          <Icon path={mdiCalendar} size={0.75} />
                        </Box>
                        Date
                      </MenuItem>
                      <MenuItem
                        onClick={(event) => openQuerySubmenu(event, "with")}
                      >
                        <Box
                          component="span"
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            mr: 1,
                          }}
                        >
                          <Icon path={mdiFormatListBulleted} size={0.75} />
                        </Box>
                        With
                      </MenuItem>
                    </Menu>
                    <Menu
                      anchorEl={querySubmenuAnchor}
                      open={
                        Boolean(querySubmenuAnchor) && querySubmenuKey !== null
                      }
                      onClose={closeQueryMenu}
                      anchorOrigin={{
                        horizontal: querySubmenuOpenLeft ? "left" : "right",
                        vertical: "top",
                      }}
                      transformOrigin={{
                        horizontal: querySubmenuOpenLeft ? "right" : "left",
                        vertical: "top",
                      }}
                    >
                      {querySubmenuKey &&
                        querySubmenuGroups[querySubmenuKey].map((template) => (
                          <MenuItem
                            key={template.label}
                            onClick={() => {
                              prependQueryTemplate(
                                template,
                                field.value,
                                handleTextChange,
                              );
                              closeQueryMenu();
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
                              <Icon path={template.iconPath} size={0.75} />
                            </Box>
                            {template.label}
                          </MenuItem>
                        ))}
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
                            if (!isEditing) {
                              onFilterCategoryChange("");
                            }
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
                          if (!isEditing) {
                            onFilterCategoryChange(NO_CATEGORY_FILTER_VALUE);
                          }
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
                            if (!isEditing) {
                              onFilterCategoryChange(category.id);
                            }
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
