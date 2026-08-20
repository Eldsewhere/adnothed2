import { useState, type MouseEvent } from "react";
import {
  Box,
  Checkbox,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  colors,
} from "@mui/material";
import { Icon } from "@mdi/react";
import {
  mdiBell,
  mdiChevronDown,
  mdiClockOutline,
  mdiDotsVertical,
  mdiEyeOffOutline,
  mdiEyeOutline,
  mdiLabelOff,
  mdiPencil,
  mdiPin,
} from "@mdi/js";
import dayjs from "dayjs";
import type { Label, Note, Status } from "../types";
import {
  formatDueDate,
  formatTimestamp,
  isToday,
} from "../utils/formatTimestamp";
import { splitTextByUrls } from "../utils/textPatterns";
import LabelIcon from "./ui/LabelIcon";
import HashtagChip from "./HashtagChip";
import { getStatusTextStyle } from "../utils/statusStyles";

const CHECKBOX_ROW_PATTERN = /^\[ ?([xX])? ?\]\s?(.*)$/;

const isTomorrow = (timestamp: number): boolean => {
  const target = dayjs.unix(timestamp).startOf("day");
  const tomorrow = dayjs().add(1, "day").startOf("day");
  return target.isSame(tomorrow, "day");
};

type NoteListRowProps = {
  note: Note;
  label?: Label;
  status?: Status;
  top: number;
  height: number;
  isPriority: boolean;
  isLastNote: boolean;
  isPriorityBoundary: boolean;
  isPriorityGroupStart: boolean;
  isPriorityGroupEnd: boolean;
  isNonPriorityGroupStart: boolean;
  isNonPriorityGroupEnd: boolean;
  dayIndex: number;
  selectMode: boolean;
  globalIndex?: number;
  selectedIds: Set<string>;
  isOverflowing: boolean;
  isExpandable: boolean;
  isEditing: boolean;
  shouldHighlightRecentEdit: boolean;
  onToggleSelect: (id: string) => void;
  onOpenLabelMenu: (event: MouseEvent<HTMLElement>, note: Note) => void;
  onToggleCheckbox: (note: Note, rowIndex: number) => void;
  onOpenOverflow: (noteId: string) => void;
  onOpenActionsMenu: (
    event: MouseEvent<HTMLElement>,
    note: Note,
    openStatusPicker?: boolean,
  ) => void;
  setnoteTextRef: (element: HTMLElement | null) => void;
  availableHashtags?: string[];
  filterText?: string;
  onFilterTextChange?: (value: string) => void;
  onToggleHashtagFilter?: (tag: string) => void;
  onToggleHashtagInDraft?: (tag: string) => void;
  onAppendHashtagToNote?: (note: Note, tag: string) => void;
  onRemoveHashtagFromNote?: (note: Note, tag: string) => void;
};

const NoteListRow = ({
  note,
  label,
  status,
  top,
  height,
  isPriority,
  isLastNote,
  isPriorityBoundary,
  isPriorityGroupStart,
  isPriorityGroupEnd,
  isNonPriorityGroupStart,
  isNonPriorityGroupEnd,
  dayIndex,
  selectMode,
  globalIndex,
  selectedIds,
  isOverflowing,
  isExpandable,
  isEditing,
  shouldHighlightRecentEdit,
  onToggleSelect,
  onOpenLabelMenu,
  onToggleCheckbox,
  onOpenOverflow,
  onOpenActionsMenu,
  setnoteTextRef,
  filterText = "",
  onToggleHashtagInDraft,
  onRemoveHashtagFromNote,
}: NoteListRowProps) => {
  const shouldUsePriorityDueDate =
    note.due !== undefined && (isToday(note.due) || isTomorrow(note.due));
  const [isSpoilerVisible, setIsSpoilerVisible] = useState(false);
  const statusStyle =
    status && status.format !== "spoiler"
      ? getStatusTextStyle(status.format)
      : {};
  const activeHashtagSet = new Set(
    (filterText || "")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean),
  );
  const isHashtagActive = (tag: string) => {
    const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;
    return activeHashtagSet.has(normalizedTag);
  };
  const isSpoilerStatus = status?.format === "spoiler";
  const shouldHideSpoilerText = isSpoilerStatus && !isSpoilerVisible;

  const renderTextWithHashtags = (value: string) =>
    value.split(/(#\w[\w-]*\b)/g).map((part, index) => {
      if (!/^#\w[\w-]*$/.test(part)) {
        return <span key={`${part}-${index}`}>{part}</span>;
      }

      const isActive = isHashtagActive(part);
      return (
        <HashtagChip
          key={`${part}-${index}`}
          tag={part}
          selected={isActive}
          onClick={() => {
            onToggleHashtagInDraft?.(part);
          }}
          onDelete={() => {
            onRemoveHashtagFromNote?.(note, part);
          }}
          showDelete
        />
      );
    });

  const maskSpoilerText = (value: string): string =>
    Array.from(value)
      .map((char) => (char === " " ? " " : "•"))
      .join("");

  return (
    <Box
      key={note.id}
      sx={{
        position: "absolute",
        top,
        left: 0,
        right: 0,
        height,
        display: "flex",
        alignItems: "center",
        borderBottom: isPriorityBoundary ? "6px solid " : "3px solid",
        paddingX: 1,
        borderTopLeftRadius:
          isPriorityGroupStart || isNonPriorityGroupStart ? 8 : 0,
        borderTopRightRadius:
          isPriorityGroupStart || isNonPriorityGroupStart ? 8 : 0,
        borderBottomLeftRadius:
          isPriorityGroupEnd || isNonPriorityGroupEnd || isLastNote ? 12 : 0,
        borderBottomRightRadius:
          isPriorityGroupEnd || isNonPriorityGroupEnd || isLastNote ? 12 : 0,
        borderColor: colors.grey[900],
        overflow: "hidden",
        bgcolor: shouldHighlightRecentEdit
          ? "rgba(76, 175, 80, 0.18)"
          : isPriority
            ? "#414d4b"
            : dayIndex % 2 === 0
              ? colors.blueGrey[900]
              : colors.blueGrey[800],
      }}
    >
      {selectMode && (
        <Checkbox
          size="small"
          checked={selectedIds.has(note.id)}
          onChange={() => onToggleSelect(note.id)}
          sx={{ p: 0.5, mr: 0.5 }}
        />
      )}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          pr: 1,
        }}
      >
        <Tooltip title={label ? label.name : "Assign a label"} arrow>
          <IconButton
            aria-label={`Change label for ${note.text}`}
            size="small"
            onClick={(event: MouseEvent<HTMLElement>) =>
              onOpenLabelMenu(event, note)
            }
            sx={{
              p: 0.5,
              color: label ? "inherit" : colors.blueGrey[500],
            }}
          >
            {label ? (
              <LabelIcon icon={label.icon} color={label.color} size={0.8} />
            ) : (
              <Icon path={mdiLabelOff} size={0.8} />
            )}
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, px: 1, textAlign: "left" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            minWidth: 0,
          }}
        >
          <Typography
            component="div"
            ref={setnoteTextRef}
            data-note-text-id={note.id}
            sx={{
              flex: 1,
              minWidth: 0,
              textAlign: "left",
              whiteSpace: "pre-wrap",
              overflow: "hidden",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
              display: "-webkit-box",
              WebkitLineClamp: isOverflowing ? 4 : 2,
              WebkitBoxOrient: "vertical",
              ...statusStyle,
            }}
          >
            {isSpoilerStatus && (
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  verticalAlign: "middle",
                  mr: 0.5,
                }}
              >
                <Tooltip
                  title={isSpoilerVisible ? "Hide spoiler" : "Reveal spoiler"}
                  arrow
                >
                  <IconButton
                    size="small"
                    aria-label={
                      isSpoilerVisible ? "Hide spoiler" : "Reveal spoiler"
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      setIsSpoilerVisible((value) => !value);
                    }}
                    sx={{
                      p: 0,
                      minWidth: 20,
                      width: 20,
                      height: 20,
                      color: "inherit",
                    }}
                  >
                    <Icon
                      path={isSpoilerVisible ? mdiEyeOutline : mdiEyeOffOutline}
                      size={0.7}
                    />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
            {note.text.split("\n").map((row, rowIndex) => {
              const checkboxMatch = row.match(CHECKBOX_ROW_PATTERN);
              const isChecked = checkboxMatch?.[1]?.toLowerCase() === "x";
              const rowText = checkboxMatch?.[2] ?? row;
              const visibleRowText = shouldHideSpoilerText
                ? maskSpoilerText(rowText)
                : rowText;

              return (
                <Box
                  key={`${rowIndex}-${row}`}
                  component="span"
                  sx={{ display: "inline" }}
                >
                  {checkboxMatch && (
                    <Checkbox
                      slotProps={{
                        input: {
                          "aria-labelledby": `note-text-${note.id}-row-${rowIndex}`,
                        },
                      }}
                      checked={isChecked}
                      onChange={() => onToggleCheckbox(note, rowIndex)}
                      size="small"
                      sx={{
                        p: 0,
                        mr: 0.25,
                        verticalAlign: "text-bottom",
                      }}
                    />
                  )}
                  <Box
                    id={
                      checkboxMatch
                        ? `note-text-${note.id}-row-${rowIndex}`
                        : undefined
                    }
                    component="span"
                    sx={{
                      textDecoration: isChecked ? "line-through" : "none",
                    }}
                  >
                    {!selectMode &&
                    /^#\w[\w-]*$/.test(visibleRowText.trim()) ? (
                      <HashtagChip
                        tag={visibleRowText.trim()}
                        selected={isHashtagActive(visibleRowText.trim())}
                        onClick={() => {
                          onToggleHashtagInDraft?.(visibleRowText.trim());
                        }}
                        onDelete={() => {
                          onRemoveHashtagFromNote?.(
                            note,
                            visibleRowText.trim(),
                          );
                        }}
                        showDelete
                      />
                    ) : (
                      splitTextByUrls(visibleRowText).map((part, partIndex) =>
                        part.isUrl ? (
                          <Box
                            key={partIndex}
                            component="a"
                            href={part.value}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              color: "info.main",
                              textDecoration: "underline",
                              wordBreak: "break-word",
                            }}
                          >
                            {part.value}
                          </Box>
                        ) : (
                          renderTextWithHashtags(part.value)
                        ),
                      )
                    )}
                  </Box>
                  {rowIndex < note.text.split("\n").length - 1 && <br />}
                </Box>
              );
            })}
          </Typography>
          {isExpandable && (
            <Tooltip title="Expand note" arrow>
              <IconButton
                aria-label={`Expand ${note.text}`}
                size="small"
                onClick={() => onOpenOverflow(note.id)}
                sx={{ ml: 0.25, p: 0.25, flexShrink: 0 }}
              >
                <Icon path={mdiChevronDown} size={0.7} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Stack
            sx={{
              justifyContent: "space-between",
              flexDirection: "row",
              width: "100%",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                color: shouldUsePriorityDueDate
                  ? colors.orange[300]
                  : isToday(note.createdAt) ||
                      note.pinned ||
                      (note.due !== undefined &&
                        (isToday(note.due) || isTomorrow(note.due))) ||
                      note.hasNotification
                    ? colors.lightGreen[400]
                    : colors.blueGrey[300],
              }}
            >
              {shouldUsePriorityDueDate
                ? formatDueDate(note.due!)
                : formatTimestamp(note.createdAt)}
              {note.emoji && (
                <Tooltip title={status ? status.name : "Note status"} arrow>
                  <Box
                    component="span"
                    role="img"
                    aria-label={status ? status.name : "Note status"}
                    onClick={(event: MouseEvent<HTMLElement>) => {
                      event.stopPropagation();
                      onOpenActionsMenu(event, note, true);
                    }}
                    sx={{
                      ml: 0.5,
                      display: "inline-flex",
                      alignItems: "center",
                      fontSize: "0.85rem",
                      lineHeight: 1,
                      cursor: "pointer",
                    }}
                  >
                    {note.emoji}
                  </Box>
                </Tooltip>
              )}
              {shouldUsePriorityDueDate && (
                <Tooltip title="Due date" aria-label={undefined} arrow>
                  <Box
                    component="span"
                    sx={{
                      ml: 0.5,
                      display: "inline-flex",
                      alignItems: "center",
                      color: colors.orange[300],
                    }}
                  >
                    <Icon path={mdiClockOutline} size={0.5} />
                  </Box>
                </Tooltip>
              )}
              {note.hasNotification && (
                <Tooltip title="Notified" aria-label={undefined} arrow>
                  <Box
                    component="span"
                    sx={{
                      ml: 0.5,
                      display: "inline-flex",
                      color: shouldUsePriorityDueDate
                        ? colors.orange[300]
                        : colors.lightGreen[400],
                    }}
                  >
                    <Icon path={mdiBell} size={0.5} />
                  </Box>
                </Tooltip>
              )}
              {note.pinned && (
                <Tooltip title="Pinned" aria-label={undefined} arrow>
                  <Box
                    component="span"
                    sx={{
                      ml: 0.5,
                      display: "inline-flex",
                      color: shouldUsePriorityDueDate
                        ? colors.orange[300]
                        : colors.lightGreen[400],
                    }}
                  >
                    <Icon path={mdiPin} size={0.6} />
                  </Box>
                </Tooltip>
              )}
              {isEditing && (
                <Tooltip title="Editing note" aria-label={undefined} arrow>
                  <Box
                    component="span"
                    sx={{
                      ml: 0.5,
                      display: "inline-flex",
                      color: colors.orange[300],
                    }}
                  >
                    <Icon path={mdiPencil} size={0.5} />
                  </Box>
                </Tooltip>
              )}
            </Typography>
            {selectMode && globalIndex !== undefined ? (
              <Typography
                variant="caption"
                sx={{
                  textAlign: "right",
                  display: "block",
                  color: colors.blueGrey[300],
                }}
              >
                #{globalIndex}
              </Typography>
            ) : !shouldUsePriorityDueDate &&
              note.due !== undefined &&
              (isToday(note.due) ||
                isTomorrow(note.due) ||
                note.due >= dayjs().unix()) ? (
              <Typography
                variant="caption"
                sx={{
                  textAlign: "right",
                  display: "block",
                  color: colors.orange[300],
                }}
              >
                {formatDueDate(note.due)}
              </Typography>
            ) : null}
          </Stack>
        </Box>
      </Box>
      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Tooltip title="Actions">
          <IconButton
            aria-label={`Actions for ${note.text}`}
            size="small"
            onClick={(event: MouseEvent<HTMLElement>) =>
              onOpenActionsMenu(event, note)
            }
            disabled={selectMode}
          >
            <Icon path={mdiDotsVertical} size={0.8} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default NoteListRow;
