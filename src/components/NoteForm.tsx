import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Box,
  colors,
  IconButton,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import { Icon } from "@mdi/react";
import type { Label, LabelFormValues, Note, NoteFormValues } from "../types";
import {
  mdiCalendarClock,
  mdiCancel,
  mdiCheckCircle,
  mdiChevronDown,
  mdiLabelMultiple,
} from "@mdi/js";
import LabelIcon from "./ui/LabelIcon";
import { countGraphemes } from "../utils/textLength";
import EmojiMenu from "./dialogs/EmojiMenu";
import LabelMenu from "./dialogs/LabelMenu";
import NoteFormActionsMenu from "./dialogs/NoteFormActionsMenu";

type NoteFormProps = {
  editingNote: Note | null;
  cloneNote?: Note | null;
  initialText?: string;
  textValue?: string;
  filterLabelId?: string;
  labels: Label[];
  dueLabel?: string;
  dueFutureCount?: number;
  onDueDateClick?: () => void;
  onSubmit: (values: NoteFormValues) => void | boolean;
  onCancelEdit: () => void;
  onFilterTextChange: (value: string) => void;
  onFilterLabelChange: (value: string) => void;
  onClearFilters: () => void;
  onNoteTextChange?: (value: string) => void;
  labelManagement: {
    notes: Note[];
    editingLabel: Label | null;
    onSubmit: (
      values: LabelFormValues & {
        icon: NonNullable<LabelFormValues["icon"]>;
      },
    ) => void | boolean;
    onCancelEdit: () => void;
    onEdit: (label: Label) => void;
    onDelete: (label: Label) => void;
    newLabelId?: string | null;
  };
};

const emptyValues: NoteFormValues = { icon: "", text: "" };

const BULLET_PREFIX = "• ";
const CHECKBOX_PREFIX_PATTERN = /^\[ ?[xX]? ?\]\s?/;

const getAutoListContinuation = (
  value: string,
  caretPosition: number,
): { nextValue: string; cursorPosition: number } | null => {
  if (caretPosition < 0) {
    return null;
  }

  const beforeCaret = value.slice(0, caretPosition);
  const lineStartIndex = beforeCaret.lastIndexOf("\n") + 1;
  const currentLine = beforeCaret.slice(lineStartIndex);
  const currentLineIndent = currentLine.match(/^\s*/)?.[0] ?? "";
  const currentLineContent = currentLine.slice(currentLineIndent.length);

  const continuationPrefix = currentLineContent.startsWith(BULLET_PREFIX)
    ? `${currentLineIndent}${BULLET_PREFIX}`
    : currentLineContent.match(CHECKBOX_PREFIX_PATTERN)
      ? `${currentLineIndent}[] `
      : null;

  if (continuationPrefix) {
    const nextValue = `${beforeCaret}\n${continuationPrefix}${value.slice(caretPosition)}`;
    return {
      nextValue,
      cursorPosition: beforeCaret.length + 1 + continuationPrefix.length,
    };
  }

  if (!currentLine.trim()) {
    const previousLineSource = beforeCaret.endsWith("\n")
      ? beforeCaret.slice(0, -1)
      : beforeCaret;
    const previousLineStart = previousLineSource.lastIndexOf("\n") + 1;
    const previousLine = previousLineSource.slice(previousLineStart);
    const previousIndent = previousLine.match(/^\s*/)?.[0] ?? "";
    const previousContent = previousLine.slice(previousIndent.length);

    const previousPrefix = previousContent.startsWith(BULLET_PREFIX)
      ? `${previousIndent}${BULLET_PREFIX}`
      : previousContent.match(CHECKBOX_PREFIX_PATTERN)
        ? `${previousIndent}[] `
        : null;

    if (previousPrefix) {
      const nextValue = `${beforeCaret}${previousPrefix}${value.slice(caretPosition)}`;
      return {
        nextValue,
        cursorPosition: beforeCaret.length + previousPrefix.length,
      };
    }
  }

  return null;
};

const NoteForm = ({
  editingNote,
  cloneNote,
  initialText,
  textValue,
  filterLabelId = "",
  labels,
  dueLabel,
  onDueDateClick,
  onSubmit,
  onCancelEdit,
  onFilterTextChange,
  onFilterLabelChange,
  onClearFilters,
  onNoteTextChange,
  labelManagement,
}: NoteFormProps) => {
  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors },
  } = useForm<NoteFormValues>({
    defaultValues: initialText ? { icon: "", text: initialText } : emptyValues,
  });
  const [labelMenuAnchor, setLabelMenuAnchor] = useState<HTMLElement | null>(
    null,
  );

  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const isEditing = editingNote !== null;
  const wasEditingRef = useRef(false);

  useEffect(() => {
    const nextValues = editingNote
      ? {
          icon: editingNote.icon ?? "",
          text: editingNote.text,
        }
      : cloneNote
        ? { icon: "", text: cloneNote.text }
        : initialText
          ? { icon: filterLabelId, text: initialText }
          : { icon: filterLabelId, text: textValue ?? "" };

    reset(nextValues);
    onNoteTextChange?.(nextValues.text);
    if (!isEditing) {
      onFilterTextChange(nextValues.text);
      onFilterLabelChange(nextValues.icon ? nextValues.icon : "");
    }
  }, [
    editingNote,
    cloneNote,
    initialText,
    filterLabelId,
    onFilterLabelChange,
    onFilterTextChange,
    onNoteTextChange,
    reset,
  ]);

  useEffect(() => {
    if (editingNote || cloneNote || initialText !== undefined) {
      return;
    }

    setValue("text", textValue ?? "");
    setValue("icon", filterLabelId ?? "");
  }, [cloneNote, editingNote, filterLabelId, initialText, setValue, textValue]);

  useEffect(() => {
    if (!isEditing) {
      wasEditingRef.current = false;
      return;
    }

    if (wasEditingRef.current) {
      return;
    }

    wasEditingRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      const textarea = textAreaRef.current;
      if (!textarea) {
        return;
      }

      textarea.focus();
      const end = textarea.value.length;
      textarea.setSelectionRange(end, end);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isEditing]);

  const stripDueTimeForValidation = (value: string) => {
    const cleaned = value
      .replace(
        /(^|[\s(])((?:[01]?\d|2[0-3]):(?:0|5|10|15|20|25|30|35|40|45|50|55)|(?:[01]?\d|2[0-3])h(?:0|5|10|15|20|25|30|35|40|45|50|55)?)([g.]?)?(?=$|[\s)\],;.!?])/gi,
        "$1",
      )
      .replace(
        /(^|[\s(])(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)([g.]?)?(?=$|[\s)\],;.!?])/gi,
        "$1",
      )
      .replace(/\b(today)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    return cleaned;
  };

  const submit = handleSubmit((values) => {
    const remainingText = stripDueTimeForValidation(values.text);
    const nonHashtagText = remainingText.replace(/(?:^|\s)#[\w-]+/g, "").trim();

    if (!remainingText || !nonHashtagText) {
      setError("text", {
        type: "required",
        message: "Note is required",
      });
      return;
    }

    const result = onSubmit(values);
    if (result === false) {
      return;
    }

    reset(emptyValues);
    if (!isEditing) {
      onFilterTextChange("");
      onFilterLabelChange("");
    }
  });

  const openLabelMenu = (event: MouseEvent<HTMLElement>) => {
    setLabelMenuAnchor(event.currentTarget);
  };

  const closeLabelMenu = () => {
    setLabelMenuAnchor(null);
  };

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <Stack
        direction="row"
        sx={{ alignItems: "flex-start", flexWrap: "wrap" }}
      >
        <Stack direction="row" sx={{ alignItems: "center", width: "100%" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Controller
              name="text"
              control={control}
              rules={{
                required: "Note is required",
                validate: (value) =>
                  countGraphemes(value) <= 500 || "Max 500 characters",
              }}
              render={({ field }) => {
                const handleTextChange = (value: string) => {
                  field.onChange(value);
                  onNoteTextChange?.(value);
                  if (!isEditing) {
                    onFilterTextChange(value);
                  }
                };
                const text = field.value;

                const noteFieldLabel = isEditing
                  ? dueLabel
                    ? `Editing note, due ${dueLabel}`
                    : "Editing note"
                  : dueLabel
                    ? `Note, due ${dueLabel}`
                    : "Create or filter note";

                return (
                  <Box sx={{ position: "relative" }}>
                    <TextField
                      {...field}
                      value={textValue ?? field.value}
                      onChange={(event) => {
                        handleTextChange(event.target.value);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") {
                          return;
                        }

                        const textarea = textAreaRef.current;
                        if (!textarea) {
                          return;
                        }

                        const selectionStart =
                          textarea.selectionStart ?? textarea.value.length;
                        const continuation = getAutoListContinuation(
                          textarea.value,
                          selectionStart,
                        );

                        if (!continuation) {
                          return;
                        }

                        event.preventDefault();
                        textarea.value = continuation.nextValue;
                        handleTextChange(continuation.nextValue);

                        window.requestAnimationFrame(() => {
                          textarea.focus();
                          textarea.selectionStart = continuation.cursorPosition;
                          textarea.selectionEnd = continuation.cursorPosition;
                        });
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
                      minRows={2}
                      maxRows={10}
                      error={!!errors.text}
                      helperText={errors.text?.message}
                      sx={{
                        borderRadius: 2,
                        "& .MuiInputBase-root": {
                          paddingBottom: "46px",
                        },
                        "& .MuiInputBase-inputMultiline": {
                          overflowY: "auto",
                          paddingBottom: 0,
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
                    <Controller
                      name="icon"
                      control={control}
                      render={({ field }) => {
                        const activelabelId = field.value;
                        const selectedLabel = labels.find(
                          (label) => label.id === activelabelId,
                        );

                        return (
                          <>
                            <Box
                              sx={{
                                position: "absolute",
                                left: 8,
                                right: 8,
                                bottom: errors.text ? 34 : 8,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 1,
                                pointerEvents: "none",
                              }}
                            >
                              <Stack
                                direction="row"
                                spacing={0.5}
                                sx={{
                                  alignItems: "center",
                                  pointerEvents: "auto",
                                }}
                              >
                                <Tooltip
                                  title={
                                    selectedLabel
                                      ? selectedLabel.name
                                      : "Assign a label"
                                  }
                                  arrow
                                >
                                  <IconButton
                                    aria-label="Choose label"
                                    size="small"
                                    onClick={openLabelMenu}
                                    sx={{
                                      color: selectedLabel
                                        ? "inherit"
                                        : colors.blueGrey[200],
                                      border: "none",
                                      backgroundColor: "transparent",
                                      borderRadius: 1,
                                      minWidth: 32,
                                      width: 32,
                                      height: 32,
                                      p: 0,
                                      boxShadow: "none",
                                      "&:hover": {
                                        backgroundColor:
                                          "rgba(148, 163, 184, 0.12)",
                                      },
                                    }}
                                  >
                                    {selectedLabel ? (
                                      <LabelIcon
                                        icon={selectedLabel.icon}
                                        color={selectedLabel.color}
                                        size={0.8}
                                      />
                                    ) : (
                                      <Icon
                                        path={mdiLabelMultiple}
                                        size={0.8}
                                      />
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
                                        color: colors.blueGrey[200],
                                        lineHeight: 1,
                                      }}
                                    >
                                      <Icon path={mdiChevronDown} size={0.6} />
                                    </Box>
                                  </IconButton>
                                </Tooltip>
                                {onDueDateClick && (
                                  <Tooltip title="Schedule note" arrow>
                                    <IconButton
                                      aria-label="Schedule note"
                                      size="small"
                                      onClick={onDueDateClick}
                                      sx={{
                                        border: "none",
                                        color: dueLabel
                                          ? colors.orange[300]
                                          : colors.blueGrey[200],
                                        borderRadius: 1,
                                        minWidth: 32,
                                        width: 32,
                                        height: 32,
                                        p: 0,
                                        boxShadow: "none",
                                        "&:hover": {
                                          backgroundColor: dueLabel
                                            ? "rgba(255, 152, 0, 0.2)"
                                            : "rgba(148, 163, 184, 0.12)",
                                        },
                                      }}
                                    >
                                      <Icon
                                        path={mdiCalendarClock}
                                        style={{
                                          fill: dueLabel
                                            ? "rgba(255, 152, 0, 0.14)"
                                            : "transparent",
                                        }}
                                        size={0.8}
                                      />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                <NoteFormActionsMenu
                                  value={text}
                                  onTextChange={handleTextChange}
                                  onClear={() => {
                                    handleTextChange("");
                                    field.onChange("");
                                    onClearFilters();
                                  }}
                                  textAreaRef={textAreaRef}
                                />
                                <EmojiMenu
                                  value={text}
                                  onTextChange={handleTextChange}
                                  textAreaRef={textAreaRef}
                                />
                              </Stack>
                              <Stack
                                direction="row"
                                spacing={0.5}
                                sx={{
                                  alignItems: "center",
                                  pointerEvents: "auto",
                                }}
                              >
                                {editingNote && (
                                  <Tooltip title="Cancel edit">
                                    <IconButton
                                      onClick={() => {
                                        onCancelEdit();
                                        reset(emptyValues);
                                      }}
                                      aria-label="Cancel"
                                      size="small"
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
                                          backgroundColor:
                                            "rgba(239, 68, 68, 0.1)",
                                        },
                                      }}
                                    >
                                      <Icon path={mdiCancel} size={0.8} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                <Tooltip
                                  title={
                                    editingNote ? "Update note" : "Add note"
                                  }
                                >
                                  <IconButton
                                    type="submit"
                                    size="small"
                                    aria-label={
                                      editingNote ? "Update note" : "Add note"
                                    }
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
                                        backgroundColor:
                                          "rgba(74, 222, 128, 0.12)",
                                      },
                                    }}
                                  >
                                    <Icon path={mdiCheckCircle} size={0.8} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </Box>
                            {labelMenuAnchor && (
                              <LabelMenu
                                onShowAllSelect={() => {
                                  field.onChange("");
                                  onFilterLabelChange("");
                                  closeLabelMenu();
                                }}
                                anchorEl={labelMenuAnchor}
                                onClose={closeLabelMenu}
                                onFilter={(label) => {
                                  onFilterLabelChange(label.id);
                                  closeLabelMenu();
                                }}
                                labels={labels}
                                selected={activelabelId}
                                management={labelManagement}
                                onSelect={(val) => {
                                  const nextValue = val ?? "";
                                  field.onChange(nextValue);
                                  onFilterLabelChange(nextValue);
                                  closeLabelMenu();
                                }}
                              />
                            )}
                          </>
                        );
                      }}
                    />
                  </Box>
                );
              }}
            />
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
};

export default NoteForm;
