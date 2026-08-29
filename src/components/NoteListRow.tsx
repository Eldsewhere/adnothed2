import { useEffect, useRef, useState, type MouseEvent } from "react";
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
  mdiArchiveArrowUp,
  mdiChevronDown,
  mdiDotsVertical,
  mdiLabelOff,
  mdiPencil,
  mdiPin,
  mdiPinOff,
} from "@mdi/js";
import dayjs from "dayjs";
import type { Label, Note } from "../types";
import {
  formatDueDate,
  formatTimestamp,
  isToday,
} from "../utils/formatTimestamp";
import { splitTextByUrls } from "../utils/textPatterns";
import LabelIcon from "./ui/LabelIcon";
import HashtagChip from "./HashtagChip";
import { MultiLayerProgressBar } from "./ui/MultiLayerProgressBar";
import NoteTimestampMetaIcons from "./dialogs/NoteTimestampMetaIcons";

const CHECKBOX_ROW_PATTERN = /^\[ ?([xX])? ?\]\s?(.*)$/;
const BULLET_ROW_PATTERN = /^\s*•\s?/;

const normalizeTag = (tag: string) => {
  const trimmedTag = tag.trim();
  return trimmedTag.startsWith("#") ? trimmedTag : `#${trimmedTag}`;
};

const getCheckboxProgress = (text: string) => {
  const rows = text.split(/\r?\n/);
  let checked = 0;
  let total = 0;

  for (const row of rows) {
    const match = row.match(CHECKBOX_ROW_PATTERN);
    if (!match) {
      continue;
    }

    total += 1;
    if (match[1]?.toLowerCase() === "x") {
      checked += 1;
    }
  }

  if (total === 0) {
    return null;
  }

  return {
    checked,
    total,
    percentage: Math.round((checked / total) * 100),
  };
};

const getBulletCount = (text: string): number | null => {
  const count = text
    .split(/\r?\n/)
    .filter((row) => BULLET_ROW_PATTERN.test(row)).length;

  return count === 0 ? null : count;
};

const isTomorrow = (timestamp: number): boolean => {
  const target = dayjs.unix(timestamp).startOf("day");
  const tomorrow = dayjs().add(1, "day").startOf("day");
  return target.isSame(tomorrow, "day");
};

type NoteListRowProps = {
  note: Note;
  label?: Label;
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
  isMenuOpen?: boolean;
  isInteractionDisabled?: boolean;
  revealAllSpoilers?: boolean;
  shouldHighlightRecentEdit: boolean;
  onToggleSelect: (id: string) => void;
  onOpenLabelMenu: (event: MouseEvent<HTMLElement>, note: Note) => void;
  onToggleCheckbox: (note: Note, rowIndex: number) => void;
  onOpenOverflow: (noteId: string) => void;
  onPin: (note: Note) => void;
  onArchive: (note: Note) => void;
  onOpenActionsMenu: (
    event: MouseEvent<HTMLElement>,
    note: Note,
    openStatusPicker?: boolean,
  ) => void;
  setnoteTextRef: (element: HTMLElement | null) => void;
  availableHashtags?: string[];
  filterText?: string;
  onFilterTextChange?: (value: string) => void;
  onToggleHashtagInDraft?: (tag: string) => void;
  onAppendHashtagToNote?: (note: Note, tag: string) => void;
  onRemoveHashtagFromNote?: (note: Note, tag: string) => void;
  onEmojiChange: (note: Note, emoji: string | null) => void;
  openDueDateDialog: (note: Note) => void;
};

const NoteListRow = ({
  note,
  label,
  top,
  height,
  isPriority,
  isLastNote,
  isPriorityBoundary,
  isPriorityGroupStart,
  isPriorityGroupEnd,
  dayIndex,
  selectMode,
  globalIndex,
  selectedIds,
  isOverflowing,
  isExpandable,
  isEditing,
  isMenuOpen = false,
  isInteractionDisabled = false,
  revealAllSpoilers = false,
  shouldHighlightRecentEdit,
  onToggleSelect,
  onOpenLabelMenu,
  onToggleCheckbox,
  onOpenOverflow,
  onPin,
  onArchive,
  onOpenActionsMenu,
  setnoteTextRef,
  availableHashtags = [],
  filterText = "",
  onToggleHashtagInDraft,
  onRemoveHashtagFromNote,
  onEmojiChange,
  openDueDateDialog,
}: NoteListRowProps) => {
  const isExistingHashtag = (tag: string) =>
    availableHashtags.some(
      (existingTag) => normalizeTag(existingTag) === normalizeTag(tag),
    );

  const getActiveInputHashtag = () => {
    const currentValue = filterText ?? "";
    const lastToken = currentValue.split(/\s+/).at(-1) ?? "";

    if (!/^#\w[\w-]*$/.test(lastToken)) {
      return null;
    }

    return normalizeTag(lastToken).toLowerCase();
  };

  const isInputMatchedHashtag = (tag: string) => {
    const normalizedTag = normalizeTag(tag).toLowerCase();
    const activeInputHashtag = getActiveInputHashtag();

    return (
      activeInputHashtag !== null &&
      isExistingHashtag(tag) &&
      normalizedTag === activeInputHashtag
    );
  };

  const isPastDueDate =
    !note.completed &&
    note.due !== undefined &&
    dayjs.unix(note.due).isBefore(dayjs().startOf("day"));
  const isFutureDueDate =
    !note.completed &&
    note.due !== undefined &&
    dayjs.unix(note.due).isAfter(dayjs().add(1, "day").startOf("day"));
  const shouldDisplayDueDateForMeta = note.due !== undefined && !note.completed;
  const shouldUsePriorityDueDate =
    !note.completed &&
    note.due !== undefined &&
    (isToday(note.due) || isTomorrow(note.due));
  const shouldUseFutureDueDateTextColor =
    !note.completed && note.due !== undefined && isFutureDueDate;
  const shouldShowDueDateIcon =
    !note.completed &&
    note.due !== undefined &&
    (shouldUsePriorityDueDate || shouldUseFutureDueDateTextColor);
  const shouldShowCompleteIcon = note.completed || isPastDueDate;
  const isScheduledStatus =
    !note.archived &&
    !note.completed &&
    note.due !== undefined &&
    (shouldUsePriorityDueDate || shouldUseFutureDueDateTextColor || isPriority);
  const noteIconColor = note.archived
    ? colors.red[300]
    : isScheduledStatus
      ? colors.orange[300]
      : colors.lightGreen[400];
  const checkboxProgress = getCheckboxProgress(note.text);
  const bulletCount = getBulletCount(note.text);
  const [isSpoilerVisible, setIsSpoilerVisible] = useState(false);
  useEffect(() => {
    setIsSpoilerVisible(false);
  }, [note.id]);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartXRef = useRef<number | null>(null);
  const MENU_OPEN_DRAG_THRESHOLD = 80;
  const isSpoilerActive = Boolean(note.spoiler);
  const shouldHideSpoilerText =
    isSpoilerActive && !(isSpoilerVisible || revealAllSpoilers);

  const handleSpoilerVisibilityToggle = () => {
    if (!isSpoilerActive) {
      return;
    }
    setIsSpoilerVisible((value) => !value);
  };

  const renderTextWithHashtags = (value: string) =>
    value.split(/(#\w[\w-]*\b)/g).map((part, index) => {
      if (!/^#\w[\w-]*$/.test(part)) {
        return <span key={`${part}-${index}`}>{part}</span>;
      }

      return (
        <HashtagChip
          key={`${part}-${index}`}
          tag={part}
          selected={isInputMatchedHashtag(part)}
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

  const resetDragState = () => {
    dragStartXRef.current = null;
    setDragOffset(0);
  };

  const dragDirection = dragOffset < 0 ? "menu" : dragOffset > 0 ? "pin" : null;
  const dragActionIcon =
    dragDirection === "pin"
      ? note.archived
        ? mdiArchiveArrowUp
        : note.pinned
          ? mdiPinOff
          : mdiPin
      : mdiDotsVertical;
  const dragActionOpacity = dragDirection
    ? Math.min(1, 0.2 + Math.abs(dragOffset) / (MENU_OPEN_DRAG_THRESHOLD * 1.6))
    : 0;

  const handleRowPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (selectMode || isInteractionDisabled || event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;
    if (
      target.closest(
        "button, input, a, label, .MuiCheckbox-root, .MuiChip-root, [role='img']",
      )
    ) {
      return;
    }

    dragStartXRef.current = event.clientX;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleRowPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (dragStartXRef.current === null) {
      return;
    }

    const deltaX = event.clientX - dragStartXRef.current;
    setDragOffset(Math.max(-120, Math.min(deltaX, 120)));
  };

  const handleRowPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    if (dragStartXRef.current === null) {
      return;
    }

    const shouldOpenActions = dragOffset < -MENU_OPEN_DRAG_THRESHOLD;
    const shouldPin = dragOffset > MENU_OPEN_DRAG_THRESHOLD;
    resetDragState();

    if (shouldOpenActions) {
      const syntheticEvent = {
        currentTarget: event.currentTarget,
      } as unknown as MouseEvent<HTMLElement>;
      onOpenActionsMenu(syntheticEvent, note);
      return;
    }

    if (shouldPin) {
      if (note.archived) {
        onArchive(note);
        return;
      }
      onPin(note);
    }
  };

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
        borderTopLeftRadius: isPriorityGroupStart ? 8 : 0,
        borderTopRightRadius: isPriorityGroupStart ? 8 : 0,
        borderBottomLeftRadius: isPriorityGroupEnd || isLastNote ? 12 : 0,
        borderBottomRightRadius: isPriorityGroupEnd || isLastNote ? 12 : 0,
        borderColor: colors.grey[900],
        overflow: "hidden",
        touchAction: "pan-y",
        userSelect: "none",
      }}
      onPointerDown={handleRowPointerDown}
      onPointerMove={handleRowPointerMove}
      onPointerUp={handleRowPointerUp}
      onPointerLeave={resetDragState}
      onPointerCancel={resetDragState}
    >
      {dragDirection && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: dragDirection === "pin" ? "flex-start" : "flex-end",
            px: 1.5,
            pointerEvents: "none",
            opacity: dragActionOpacity,
            transition: "opacity 0.12s ease",
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color:
                dragDirection === "pin"
                  ? note.pinned
                    ? colors.orange[300]
                    : colors.lightGreen[300]
                  : colors.blue[300],
              fontSize: "1.4rem",
              lineHeight: 1,
            }}
          >
            <Icon path={dragActionIcon} size={1} />
          </Box>
        </Box>
      )}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: "100%",
          px: 1,
          bgcolor: isEditing
            ? "rgba(255, 152, 0, 0.18)"
            : shouldHighlightRecentEdit
              ? "rgba(76, 175, 80, 0.18)"
              : isPriority
                ? "#414d4b"
                : dayIndex % 2 === 0
                  ? colors.blueGrey[900]
                  : colors.blueGrey[800],
          transform: `translateX(${dragOffset}px)`,
          transition: dragStartXRef.current ? "none" : "transform 0.2s ease",
          opacity: isMenuOpen ? 0.7 : 1,
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
            pr: 0.1,
          }}
        >
          <Tooltip title={label ? label.name : "Assign a label"} arrow>
            <IconButton
              aria-label={`Change label for ${note.text}`}
              size="small"
              onClick={(event: MouseEvent<HTMLElement>) =>
                onOpenLabelMenu(event, note)
              }
              disabled={isInteractionDisabled}
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
              gap: 0.5,
            }}
          >
            {isEditing && (
              <Tooltip title="Editing note" aria-label={undefined} arrow>
                <Box
                  component="span"
                  sx={{
                    display: "inline-flex",
                    color: colors.orange[300],
                    flexShrink: 0,
                  }}
                >
                  <Icon path={mdiPencil} size={0.6} />
                </Box>
              </Tooltip>
            )}
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
              }}
            >
              {note.text.split("\n").map((row, rowIndex) => {
                const checkboxMatch = row.match(CHECKBOX_ROW_PATTERN);
                const isChecked = checkboxMatch?.[1]?.toLowerCase() === "x";
                const shouldStrikeText = note.completed || isChecked;
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
                        textDecoration: "none",
                      }}
                    >
                      {!selectMode &&
                      /^#\w[\w-]*$/.test(visibleRowText.trim()) ? (
                        <HashtagChip
                          tag={visibleRowText.trim()}
                          selected={isInputMatchedHashtag(
                            visibleRowText.trim(),
                          )}
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
                          disabled={isInteractionDisabled}
                        />
                      ) : (
                        splitTextByUrls(visibleRowText).map(
                          (part, partIndex) =>
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
                              <Box
                                key={partIndex}
                                component="span"
                                sx={{
                                  textDecoration: shouldStrikeText
                                    ? "line-through"
                                    : "none",
                                }}
                              >
                                {renderTextWithHashtags(part.value)}
                              </Box>
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
                  disabled={isInteractionDisabled}
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
                  color: note.archived
                    ? colors.red[300]
                    : shouldUseFutureDueDateTextColor ||
                        shouldUsePriorityDueDate
                      ? colors.orange[300]
                      : isToday(note.createdAt) ||
                          note.pinned ||
                          (note.due !== undefined &&
                            !note.completed &&
                            (isToday(note.due) || isTomorrow(note.due))) ||
                          note.hasNotification
                        ? colors.lightGreen[400]
                        : colors.blueGrey[300],
                }}
              >
                <Box
                  component="span"
                  sx={{
                    textDecoration:
                      note.completed && shouldDisplayDueDateForMeta
                        ? "line-through"
                        : "none",
                  }}
                >
                  {shouldDisplayDueDateForMeta
                    ? formatDueDate(note.due!)
                    : formatTimestamp(note.createdAt)}
                </Box>
                <NoteTimestampMetaIcons
                  note={note}
                  noteIconColor={noteIconColor}
                  checkboxProgress={checkboxProgress}
                  bulletCount={bulletCount}
                  shouldShowCompleteIcon={shouldShowCompleteIcon}
                  shouldShowDueDateIcon={shouldShowDueDateIcon}
                  shouldUsePriorityDueDate={shouldUsePriorityDueDate}
                  interactionDisabled={isInteractionDisabled}
                  isSpoilerActive={isSpoilerActive}
                  isSpoilerVisible={isSpoilerVisible || revealAllSpoilers}
                  onToggleSpoilerVisibility={handleSpoilerVisibilityToggle}
                  onOpenActionsMenu={onOpenActionsMenu}
                  onEmojiChange={onEmojiChange}
                  openDueDateDialog={openDueDateDialog}
                />
                <MultiLayerProgressBar
                  timestamp={
                    !note.archived &&
                    note.due &&
                    !note.pinned &&
                    !note.completed
                      ? note.due
                      : undefined
                  }
                />
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
              disabled={selectMode || isInteractionDisabled}
            >
              <Icon path={mdiDotsVertical} size={0.8} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

export default NoteListRow;
