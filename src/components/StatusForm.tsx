import { useEffect, useState, type MouseEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  colors,
} from "@mui/material";
import { mdiCancel, mdiCheckCircle, mdiEmoticonOutline } from "@mdi/js";
import { Icon } from "@mdi/react";
import Picker, { Theme, type EmojiClickData } from "emoji-picker-react";
import emojiData from "emoji-picker-react/dist/data/emojis";
import type { Status, StatusFormValues, StatusFormat } from "../types";
import {
  STATUS_FORMAT_LABELS,
  STATUS_FORMAT_OPTIONS,
} from "../utils/statusStyles";

type StatusFormProps = {
  editingStatus: Status | null;
  onSubmit: (values: StatusFormValues) => boolean | void;
  onCancelEdit: () => void;
};

type StatusEmojiOption = {
  emoji: string;
  label: string;
  search: string;
};

const buildStatusEmojiOptions = (): StatusEmojiOption[] => {
  const seen = new Set<string>();
  const options: StatusEmojiOption[] = [];

  const groups = Object.values(emojiData.emojis ?? {});

  for (const group of groups) {
    for (const item of Array.isArray(group) ? group : []) {
      const entry = item as { u?: string; n?: string[] } | undefined;
      const unified = entry?.u;
      const names = entry?.n ?? [];

      if (!unified || names.length === 0) {
        continue;
      }

      const emoji = unified
        .split("-")
        .map((code) => Number.parseInt(code, 16))
        .filter((value) => Number.isFinite(value))
        .map((value) => String.fromCodePoint(value))
        .join("");

      const name = names[names.length - 1] ?? names[0] ?? "";
      const label = name
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      if (!emoji || !label || seen.has(`${emoji}:${label}`)) {
        continue;
      }

      seen.add(`${emoji}:${label}`);
      options.push({
        emoji,
        label,
        search: names.join(" ").toLowerCase(),
      });
    }
  }

  return options;
};

const statusEmojiOptions = buildStatusEmojiOptions();

const emptyValues: StatusFormValues = { name: "", emoji: "", format: "none" };

const StatusForm = ({
  editingStatus,
  onSubmit,
  onCancelEdit,
}: StatusFormProps) => {
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLElement | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StatusFormValues>({ defaultValues: emptyValues });

  useEffect(() => {
    reset(
      editingStatus
        ? {
            name: editingStatus.name,
            emoji: editingStatus.emoji,
            format: editingStatus.format,
          }
        : emptyValues,
    );
  }, [editingStatus, reset]);

  const submit = handleSubmit((values) => {
    if (!values.emoji.trim()) {
      return;
    }
    const result = onSubmit({
      ...values,
      emoji: values.emoji,
      format: values.format,
    });
    if (result !== false) {
      reset(emptyValues);
    }
  });

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <Stack direction="column" sx={{ gap: 1, width: "100%" }}>
        <Controller
          name="emoji"
          control={control}
          rules={{ required: "Emoji is required" }}
          render={({ field: { onChange, value, ...field } }) => {
            const selectEmoji = (emojiData: EmojiClickData) => {
              onChange(emojiData.emoji);

              setEmojiAnchorEl(null);
            };

            const selectedEmoji = typeof value === "string" ? value : "";
            const selectedOption =
              statusEmojiOptions.find(
                (option) => option.emoji === selectedEmoji,
              ) ?? null;
            const fieldDisplayValue = selectedEmoji
              ? (selectedOption?.label ?? selectedEmoji)
              : "";

            return (
              <>
                <TextField
                  {...field}
                  label="Status emoji"
                  size="small"
                  fullWidth
                  value={fieldDisplayValue}
                  onClick={(event: MouseEvent<HTMLElement>) =>
                    setEmojiAnchorEl(event.currentTarget)
                  }
                  error={!!errors.emoji}
                  helperText={errors.emoji?.message}
                  slotProps={{
                    input: {
                      readOnly: true,
                      startAdornment: selectedEmoji ? (
                        <Box
                          component="span"
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            mr: 1,
                            fontSize: "1.1rem",
                          }}
                        >
                          {selectedEmoji}
                        </Box>
                      ) : null,
                      endAdornment: (
                        <Tooltip title="Choose emoji">
                          <IconButton
                            aria-label="Choose emoji"
                            size="small"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={(event: MouseEvent<HTMLElement>) => {
                              event.stopPropagation();
                              setEmojiAnchorEl(event.currentTarget);
                            }}
                          >
                            <Icon path={mdiEmoticonOutline} size={0.75} />
                          </IconButton>
                        </Tooltip>
                      ),
                    },
                  }}
                  sx={{
                    width: "100%",
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
                <Menu
                  anchorEl={emojiAnchorEl}
                  open={Boolean(emojiAnchorEl)}
                  onClose={() => setEmojiAnchorEl(null)}
                  slotProps={{
                    paper: {
                      sx: {
                        overflow: "hidden",
                        bgcolor: "#263238",
                        border: "1px solid #455a64",
                      },
                    },
                  }}
                >
                  <Box role="group" aria-label="Status emoji picker">
                    <Picker
                      onEmojiClick={selectEmoji}
                      lazyLoadEmojis
                      theme={Theme.DARK}
                      width={352}
                      height={420}
                    />
                  </Box>
                </Menu>
              </>
            );
          }}
        />
        <Controller
          name="format"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              labelId="status-format-label"
              id="status-format"
              value={field.value || "none"}
              displayEmpty
              size="small"
              fullWidth
              aria-label="Note effect"
              renderValue={(selected) => {
                const selectedValue =
                  selected && selected !== "none"
                    ? STATUS_FORMAT_LABELS[selected as StatusFormat]
                    : "No note effect";
                return (
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    {selectedValue}
                  </Box>
                );
              }}
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
              {STATUS_FORMAT_OPTIONS.map((option) => {
                const style =
                  option === "underline"
                    ? { textDecoration: "underline" }
                    : option === "bold"
                      ? { fontWeight: 700 }
                      : option === "strikethrough"
                        ? { textDecoration: "line-through" }
                        : option === "transparent"
                          ? { opacity: 0.2 }
                          : option === "red"
                            ? { color: colors.red[400] }
                            : option === "amber"
                              ? { color: colors.orange[400] }
                              : option === "green"
                                ? { color: colors.green[400] }
                                : {};

                return (
                  <MenuItem key={option} value={option}>
                    <Box component="span" sx={style}>
                      {STATUS_FORMAT_LABELS[option as StatusFormat]}
                    </Box>
                  </MenuItem>
                );
              })}
            </Select>
          )}
        />
        <Controller
          name="name"
          control={control}
          rules={{
            required: "Status name is required",
            maxLength: { value: 20, message: "Max 20 characters" },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label="Status name"
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
                      {editingStatus && (
                        <Tooltip title="Cancel edit">
                          <span>
                            <IconButton
                              aria-label="Cancel status edit"
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
                        title={editingStatus ? "Update status" : "Add status"}
                      >
                        <span>
                          <IconButton
                            type="submit"
                            aria-label={
                              editingStatus ? "Update status" : "Add status"
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

export default StatusForm;
