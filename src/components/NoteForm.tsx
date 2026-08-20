import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Badge,
  Box,
  colors,
  IconButton,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import { Icon } from "@mdi/react";
import type { Label, Note, NoteFormValues } from "../types";
import {
  mdiCalendarClock,
  mdiCancel,
  mdiCheckCircle,
  mdiChevronDown,
  mdiLabelMultiple,
} from "@mdi/js";
import LabelIcon from "./ui/LabelIcon";
import { NO_LABEL_FILTER_VALUE } from "../utils/noteFilters";
import { countGraphemes } from "../utils/textLength";
import EmojiMenu from "./dialogs/EmojiMenu";
import LabelMenu from "./dialogs/LabelMenu";
import NoteFormActionsMenu from "./dialogs/NoteFormActionsMenu";

type NoteFormProps = {
  editingNote: Note | null;
  cloneNote?: Note | null;
  initialText?: string;
  textValue?: string;
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
};

const emptyValues: NoteFormValues = { labelId: "", text: "" };

const NoteForm = ({
  editingNote,
  cloneNote,
  initialText,
  textValue,
  labels,
  dueLabel,
  dueFutureCount = 0,
  onDueDateClick,
  onSubmit,
  onCancelEdit,
  onFilterTextChange,
  onFilterLabelChange,
  onClearFilters,
  onNoteTextChange,
}: NoteFormProps) => {
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<NoteFormValues>({
    defaultValues: initialText
      ? { labelId: "", text: initialText }
      : emptyValues,
  });
  const [labelMenuAnchor, setLabelMenuAnchor] = useState<HTMLElement | null>(
    null,
  );

  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const isEditing = editingNote !== null;

  useEffect(() => {
    const nextValues = editingNote
      ? {
          labelId: editingNote.labelId ?? "",
          text: editingNote.text,
        }
      : cloneNote
        ? { labelId: "", text: cloneNote.text }
        : initialText
          ? { labelId: "", text: initialText }
          : { labelId: "", text: textValue ?? "" };

    reset(nextValues);
    onNoteTextChange?.(nextValues.text);
    if (!isEditing) {
      onFilterTextChange(nextValues.text);
      onFilterLabelChange(nextValues.labelId ? nextValues.labelId : "");
    }
  }, [
    editingNote,
    isEditing,
    cloneNote,
    initialText,
    onFilterLabelChange,
    onFilterTextChange,
    onNoteTextChange,
    reset,
  ]);

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
    const nonHashtagText = remainingText
      .replace(/(?:^|\s)#[\w-]+/g, "")
      .trim();

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
        sx={{ alignItems: "flex-start", flexWrap: "wrap", gap: 1 }}
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

                const noteFieldLabel = dueLabel
                  ? `Note, due ${dueLabel}`
                  : "Note";

                return (
                  <Box sx={{ position: "relative" }}>
                    <TextField
                      {...field}
                      value={textValue ?? field.value}
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
                      name="labelId"
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
                                  <Tooltip title="Set due date" arrow>
                                    <Badge
                                      badgeContent={dueFutureCount}
                                      invisible={dueFutureCount === 0}
                                      anchorOrigin={{
                                        vertical: "bottom",
                                        horizontal: "right",
                                      }}
                                      sx={{
                                        "& .MuiBadge-badge": {
                                          backgroundColor: colors.orange[400],
                                          color: colors.grey[900],
                                          minWidth: 12,
                                          height: 12,
                                          fontSize: "0.5rem",
                                          bottom: 4,
                                          right: 4,
                                        },
                                      }}
                                    >
                                      <IconButton
                                        aria-label="Set note due date"
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
                                    </Badge>
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
                                  if (!isEditing) {
                                    onFilterLabelChange("");
                                  }
                                  closeLabelMenu();
                                }}
                                anchorEl={labelMenuAnchor}
                                onClose={closeLabelMenu}
                                labels={labels}
                                selected={activelabelId}
                                onSelect={(val) => {
                                  field.onChange(val ?? "");
                                  if (!isEditing) {
                                    onFilterLabelChange(
                                      val ?? NO_LABEL_FILTER_VALUE,
                                    );
                                  }
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
          <Stack
            sx={{
              alignItems: "center",
              justifyContent: "center",
              ml: 1,
              gap: 1,
            }}
          ></Stack>
        </Stack>
      </Stack>
    </Box>
  );
};

export default NoteForm;
