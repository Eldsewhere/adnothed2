import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  Box,
  Checkbox,
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  colors,
  Stack,
  DialogActions,
  Button,
  Divider,
} from "@mui/material";
import { Icon } from "@mdi/react";
import {
  mdiBell,
  mdiCalendarClock,
  mdiClose,
  mdiCheckboxMarked,
  mdiChevronDown,
  mdiContentCopy,
  mdiDotsVertical,
  mdiFormatListBulleted,
  mdiLink,
  mdiMagnify,
  mdiLabelOff,
  mdiPencil,
  mdiPin,
  mdiPinOff,
  mdiShareVariant,
  mdiTrashCanOutline,
  mdiNoteText,
  mdiOpenInNew,
} from "@mdi/js";
import type { Label, Note, NoteFilters as NoteFiltersValue } from "../types";
import {
  dateRegex,
  formatDate,
  formatDueDate,
  formatTimestamp,
  isToday,
} from "../utils/formatTimestamp";
import {
  matchesTextFilters,
  NO_LABEL_FILTER_VALUE,
  parseTextFilters,
} from "../utils/noteFilters";
import { getFirstUrl, splitTextByUrls } from "../utils/textPatterns";
import dayjs, { type Dayjs } from "dayjs";
import DueDateDialog from "./DueDateDialog";
import LabelIcon from "./ui/LabelIcon";

type NoteListProps = {
  notes: Note[];
  categories: Label[];
  filters: NoteFiltersValue;
  mostRecentAddedNoteId: string | null;
  mostRecentEditedNoteId: string | null;
  dueDaysByDate?: Map<string, number>;
  noteCountsByDay?: Map<string, number>;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  onCopy: (note: Note) => void;
  onShareLink: (note: Note) => void;
  onToggleBullet: (note: Note) => void;
  onAddCheckboxes: (note: Note) => void;
  onToggleCheckbox: (note: Note, rowIndex: number) => void;
  onNotify: (note: Note) => void;
  onCategoryChange: (note: Note, labelId: string | null) => void;
  onDueChange: (note: Note, due: number | null) => void;
  onPin: (note: Note) => void;
  selectMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onInstall?: () => void;
};

const ROW_HEIGHT = 80;
const EXPANDED_ROW_HEIGHT = 128;
const OVERSCAN = 6;
const BULLET_PREFIX = "• ";
const CHECKBOX_ROW_PATTERN = /^(\[ ?([xX])? ?\])\s?(.*)$/;

const getSearchQuery = (text: string): string =>
  text
    .split("\n")
    .map((row) =>
      row.trimStart().replace(CHECKBOX_ROW_PATTERN, "$3").replace(/^•\s?/, ""),
    )
    .join("\n")
    .trim();

const SEARCH_ICON_FILENAMES: Record<string, string> = {
  "google.com": "google.png",
  "chatgpt.com": "chatgpt.png",
  "reddit.com": "reddit.png",
  "youtube.com": "youtube.png",
  "maps.google.com": "maps.png",
  "instagram.com": "instagram.png",
  "spotify.com": "spotify.png",
  "amazon.es": "amazon-es.png",
};

const SearchSiteIcon = ({ domain }: { domain: string }) => (
  <Box
    component="img"
    src={`${import.meta.env.BASE_URL}search-icons/${SEARCH_ICON_FILENAMES[domain]}`}
    alt=""
    sx={{ width: 16, height: 16, mr: 1, flexShrink: 0 }}
  />
);

const allNonEmptyRowsBulleted = (text: string): boolean => {
  const rows = text.split("\n").filter((row) => row.trim().length > 0);
  return (
    rows.length > 0 &&
    rows.every((row) => row.trimStart().startsWith(BULLET_PREFIX))
  );
};

const allNonEmptyRowsCheckboxes = (text: string): boolean => {
  const rows = text.split("\n").filter((row) => row.trim().length > 0);
  return (
    rows.length > 0 &&
    rows.every((row) => CHECKBOX_ROW_PATTERN.test(row.trimStart()))
  );
};

function isTomorrow(date: number): boolean {
  const target = dayjs.unix(date).startOf("day");
  const tomorrow = dayjs().add(1, "day").startOf("day");

  return target.isSame(tomorrow, "day");
}

const isPriorityNote = (note: Note): boolean =>
  note.pinned ||
  (note.due !== undefined && (isToday(note.due) || isTomorrow(note.due)));

const ItemList = ({
  notes,
  categories,
  filters,
  mostRecentAddedNoteId,
  mostRecentEditedNoteId,
  dueDaysByDate,
  noteCountsByDay,
  onEdit,
  onDelete,
  onCopy,
  onShareLink,
  onToggleBullet,
  onAddCheckboxes,
  onToggleCheckbox,
  onNotify,
  onCategoryChange,
  onDueChange,
  onPin,
  selectMode,
  selectedIds,
  onToggleSelect,
  onInstall,
}: NoteListProps) => {
  const [menuAnchor, setMenuAnchor] = useState<{
    el: HTMLElement;
    note: Note;
  } | null>(null);
  const [shareMenuAnchor, setShareMenuAnchor] = useState<{
    el: HTMLElement;
    note: Note;
  } | null>(null);
  const [searchMenuAnchor, setSearchMenuAnchor] = useState<{
    el: HTMLElement;
    note: Note;
    selectedText?: string;
  } | null>(null);
  const [overflowModalnoteId, setOverflowModalnoteId] = useState<string | null>(
    null,
  );
  const [formatMenuAnchor, setFormatMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [formatMenuNote, setformatMenuNote] = useState<Note | null>(null);
  const [overflowingnoteIds, setOverflowingnoteIds] = useState<Set<string>>(
    new Set(),
  );
  const [expandablenoteIds, setExpandableNoteIds] = useState<Set<string>>(
    new Set(),
  );
  const [categoryMenuAnchor, setCategoryMenuAnchor] = useState<{
    el: HTMLElement;
    note: Note;
  } | null>(null);
  const [dueDateDialogNote, setdueDateDialogNote] = useState<Note | null>(null);
  const [dueDateValue, setDueDateValue] = useState<Dayjs | null>(null);
  const [dueHour12, setDueHour12] = useState<number>(12);
  const [dueAmPm, setDueAmPm] = useState<"AM" | "PM">("AM");
  const [dueMinute, setDueMinute] = useState<
    0 | 5 | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 45 | 50 | 55
  >(0);
  const today = useMemo(() => dayjs().startOf("day"), []);
  const endOfNextMonth = useMemo(
    () => dayjs().add(1, "month").endOf("month").startOf("day"),
    [],
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(400);

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const sortedNotes = useMemo(() => {
    const todayUnix = today.unix();
    const dayAfterTomorrowUnix = today.add(2, "day").unix();
    return [...notes].sort((a, b) => {
      const aPinned = a.pinned ? 1 : 0;
      const bPinned = b.pinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      const aIsDueSoon =
        a.due !== undefined &&
        a.due >= todayUnix &&
        a.due < dayAfterTomorrowUnix;
      const bIsDueSoon =
        b.due !== undefined &&
        b.due >= todayUnix &&
        b.due < dayAfterTomorrowUnix;
      if (aIsDueSoon !== bIsDueSoon) return aIsDueSoon ? -1 : 1;
      if (aIsDueSoon && bIsDueSoon) return (a.due ?? 0) - (b.due ?? 0);

      return b.createdAt - a.createdAt;
    });
  }, [notes, today]);
  const overflowModalNote = useMemo(
    () => notes.find((note) => note.id === overflowModalnoteId) ?? null,
    [notes, overflowModalnoteId],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setViewportHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const closeMenu = () => {
    setMenuAnchor(null);
    setShareMenuAnchor(null);
    setSearchMenuAnchor(null);
    setOverflowModalnoteId(null);
  };

  const handleEdit = (note: Note) => {
    onEdit(note);
    closeMenu();
  };

  const handleDelete = (note: Note) => {
    onDelete(note);
    closeMenu();
  };

  const handleCopy = (note: Note) => {
    onCopy(note);
    closeMenu();
  };

  const handleNotify = (note: Note) => {
    onNotify(note);
    closeMenu();
  };

  const handleToggleBullet = (note: Note) => {
    onToggleBullet(note);
    closeMenu();
  };

  const getSelectedTextForNote = (noteId: string): string | undefined => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (!selectedText || !selection?.anchorNode || !selection.focusNode) {
      return undefined;
    }

    const noteText = Array.from(
      document.querySelectorAll<HTMLElement>("[data-note-text-id]"),
    ).find((element) => element.dataset.noteTextId === noteId);
    if (
      !noteText ||
      !noteText.contains(selection.anchorNode) ||
      !noteText.contains(selection.focusNode)
    ) {
      return undefined;
    }

    return selectedText;
  };

  const handleSearch = (
    note: Note,
    searchUrl: (query: string) => string,
    selectedText?: string,
  ) => {
    window.open(
      searchUrl(encodeURIComponent(getSearchQuery(selectedText ?? note.text))),
      "_blank",
      "noopener,noreferrer",
    );
    closeMenu();
  };

  const handleOpen = (note: Note) => {
    const url = getFirstUrl(note.text);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    closeMenu();
  };

  const handleShare = async (note: Note) => {
    closeMenu();
    if (navigator.share) {
      await navigator.share({ text: note.text });
    } else {
      await navigator.clipboard.writeText(note.text);
    }
  };

  const handleShareLink = (note: Note) => {
    onShareLink(note);
    closeMenu();
  };

  const updateOverflowState = (noteId: string, element: HTMLElement | null) => {
    if (!element) return;
    const isOverflowing =
      element.scrollWidth > element.clientWidth ||
      element.scrollHeight > element.clientHeight;
    setOverflowingnoteIds((currentIds) => {
      if (!isOverflowing || currentIds.has(noteId)) return currentIds;
      const nextIds = new Set(currentIds);
      nextIds.add(noteId);
      return nextIds;
    });
    if (!overflowingnoteIds.has(noteId)) return;
    setExpandableNoteIds((currentIds) => {
      const isVerticallyOverflowing =
        element.scrollHeight > element.clientHeight;
      if (isVerticallyOverflowing === currentIds.has(noteId)) return currentIds;
      const nextIds = new Set(currentIds);
      if (isVerticallyOverflowing) {
        nextIds.add(noteId);
      } else {
        nextIds.delete(noteId);
      }
      return nextIds;
    });
  };

  const openCategoryMenu = (event: MouseEvent<HTMLElement>, note: Note) => {
    setCategoryMenuAnchor({ el: event.currentTarget, note });
  };

  const closeCategoryMenu = () => setCategoryMenuAnchor(null);

  const openDueDateDialog = (note: Note) => {
    setdueDateDialogNote(note);
    if (note.due) {
      const d = dayjs.unix(note.due);
      setDueDateValue(d.startOf("day"));
      const h24 = d.hour();
      const rawMinute = d.minute();
      const roundedMinute = (
        [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as const
      ).reduce((prev, curr) =>
        Math.abs(curr - rawMinute) < Math.abs(prev - rawMinute) ? curr : prev,
      );
      setDueMinute(roundedMinute);
      if (h24 === 0) {
        setDueHour12(12);
        setDueAmPm("AM");
      } else if (h24 < 12) {
        setDueHour12(h24);
        setDueAmPm("AM");
      } else if (h24 === 12) {
        setDueHour12(12);
        setDueAmPm("PM");
      } else {
        setDueHour12(h24 - 12);
        setDueAmPm("PM");
      }
    } else {
      setDueDateValue(today);
      setDueHour12(12);
      setDueAmPm("AM");
      setDueMinute(0);
    }
  };

  const handleSaveDueDate = () => {
    if (!dueDateDialogNote || !dueDateValue) return;
    const h24 =
      dueAmPm === "AM"
        ? dueHour12 === 12
          ? 0
          : dueHour12
        : dueHour12 === 12
          ? 12
          : dueHour12 + 12;
    const combined = dueDateValue.hour(h24).minute(dueMinute).second(0);
    onDueChange(dueDateDialogNote, combined.unix());
    setdueDateDialogNote(null);
  };

  const handleAddToGoogleCalendar = () => {
    if (!dueDateDialogNote || !dueDateValue) return;
    const h24 =
      dueAmPm === "AM"
        ? dueHour12 === 12
          ? 0
          : dueHour12
        : dueHour12 === 12
          ? 12
          : dueHour12 + 12;
    const start = dueDateValue.hour(h24).minute(dueMinute).second(0);
    const end = start.add(1, "hour");
    const formatGoogleDate = (date: Dayjs) => date.format("YYYYMMDDTHHmmss");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: dueDateDialogNote.text,
      dates: `${formatGoogleDate(start)}/${formatGoogleDate(end)}`,
      ctz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    window.open(
      `https://calendar.google.com/calendar/render?${params.toString()}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleCategorySelect = (labelId: string | null) => {
    if (!categoryMenuAnchor) {
      return;
    }
    onCategoryChange(categoryMenuAnchor.note, labelId);
    closeCategoryMenu();
  };

  const parsedTextFilters = useMemo(
    () => parseTextFilters(filters.text),
    [filters.text],
  );

  const filteredNotes = useMemo(
    () =>
      sortedNotes.filter((note, index) => {
        if (filters.labelId === NO_LABEL_FILTER_VALUE) {
          if (note.labelId !== null) {
            return false;
          }
        } else if (
          filters.labelId &&
          note.labelId !== filters.labelId
        ) {
          return false;
        }
        if (
          !matchesTextFilters(
            note.text,
            note.createdAt,
            index,
            sortedNotes.length,
            parsedTextFilters,
            note.due,
            note.labelId,
          )
        ) {
          return false;
        }
        const noteDate = formatDate(note.createdAt);
        const hasStartDate =
          filters.date.length === 10 && dateRegex.test(filters.date);
        const hasEndDate =
          filters.endDate.length === 10 && dateRegex.test(filters.endDate);

        if (hasStartDate && noteDate < filters.date.trim()) {
          return false;
        }
        if (hasEndDate && noteDate > filters.endDate.trim()) {
          return false;
        }
        if (filters.dueDate) {
          if (!note.due || formatDate(note.due) !== filters.dueDate) {
            return false;
          }
        }
        if (filters.weekday !== null) {
          const noteCreatedDate = formatDate(note.createdAt);
          const noteDueDate =
            note.due !== undefined ? formatDate(note.due) : null;
          if (
            noteCreatedDate !== filters.weekday &&
            noteDueDate !== filters.weekday
          ) {
            return false;
          }
        }
        if (filters.hasDue) {
          const todayUnix = dayjs().startOf("day").unix();
          if (note.due === undefined || note.due < todayUnix) {
            return false;
          }
        }
        return true;
      }),
    [sortedNotes, filters, parsedTextFilters],
  );

  const dayIndexByDate = useMemo(() => {
    const map = new Map<string, number>();
    const dates = [
      ...new Set(filteredNotes.map((note) => formatDate(note.createdAt))),
    ];
    dates.sort((a, b) => b.localeCompare(a));
    dates.forEach((date, index) => map.set(date, index));
    return map;
  }, [filteredNotes]);

  const rowHeights = filteredNotes.map((note) =>
    overflowingnoteIds.has(note.id) ? EXPANDED_ROW_HEIGHT : ROW_HEIGHT,
  );
  const rowOffsets = rowHeights.reduce<number[]>((offsets, height) => {
    offsets.push((offsets.at(-1) ?? 0) + height);
    return offsets;
  }, []);
  const totalHeight = rowOffsets.at(-1) ?? 0;
  const firstVisibleIndex = rowHeights.findIndex(
    (height, index) => rowOffsets[index] - height > scrollTop,
  );
  const lastVisibleIndex = rowOffsets.findIndex(
    (offset) => offset >= scrollTop + viewportHeight,
  );
  const startIndex = Math.max(
    0,
    (firstVisibleIndex === -1 ? filteredNotes.length : firstVisibleIndex) -
      OVERSCAN,
  );
  const endIndex = Math.min(
    filteredNotes.length,
    (lastVisibleIndex === -1 ? filteredNotes.length : lastVisibleIndex + 1) +
      OVERSCAN,
  );
  const visibleNotes = filteredNotes.slice(startIndex, endIndex);

  return (
    <Box>
      {filteredNotes.length === 0 ? (
        <Alert severity="info" sx={{ textAlign: "left" }}>
          {sortedNotes.length === 0 ? (
            <>
              <Box>No notes added yet</Box>
              <Box sx={{ mt: 0.5 }}>
                Notes are kept in your browser only, so they might be lost if
                browser history is cleared
              </Box>
              <Box sx={{ mt: 0.5 }}>
                Backup notes using `Save as JSON` button on `Labels` tab
              </Box>
              <Box sx={{ mt: 0.5 }}>
                Allow notification permission to receive a notification when
                adding a note or clicking `Notify` button
              </Box>
              {onInstall && (
                <Box sx={{ mt: 1 }}>
                  <Button variant="outlined" size="small" onClick={onInstall}>
                    Install app
                  </Button>
                </Box>
              )}
            </>
          ) : (
            "No notes match the current filters"
          )}
        </Alert>
      ) : (
        <Box
          ref={containerRef}
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
          sx={{
            height: "100vh",
            minHeight: 200,
            overflowY: "auto",
            position: "relative",
          }}
        >
          <Box sx={{ height: totalHeight, position: "relative" }}>
            {visibleNotes.map((note, i) => {
              const index = startIndex + i;
              const category = note.labelId
                ? categoriesById.get(note.labelId)
                : undefined;
              const dayIndex =
                dayIndexByDate.get(formatDate(note.createdAt)) ?? 0;

              const isPrioritary = isPriorityNote(note);
              const previousNote = filteredNotes[index - 1];
              const nextNote = filteredNotes[index + 1];
              const isPriorityGroupStart =
                isPrioritary && (!previousNote || !isPriorityNote(previousNote));
              const isPriorityGroupEnd =
                isPrioritary && (!nextNote || !isPriorityNote(nextNote));
              const isNonPriorityGroupStart =
                !isPrioritary &&
                (!previousNote || isPriorityNote(previousNote));
              const isNonPriorityGroupEnd =
                !isPrioritary && (!nextNote || isPriorityNote(nextNote));
              const isLastNote = index === filteredNotes.length - 1;
              const isPriorityBoundary =
                isPrioritary && (!nextNote || !isPriorityNote(nextNote));
              const isMostRecentAddedNote =
                mostRecentAddedNoteId !== null &&
                note.id === mostRecentAddedNoteId;
              const isMostRecentlyEditedNote =
                mostRecentEditedNoteId !== null &&
                note.id === mostRecentEditedNoteId;
              const shouldHighlightRecentEdit =
                isMostRecentAddedNote || isMostRecentlyEditedNote;

              return (
                <Box
                  key={note.id}
                  sx={{
                    position: "absolute",
                    top: rowOffsets[index] - rowHeights[index],
                    left: 0,
                    right: 0,
                    height: rowHeights[index],
                    display: "flex",
                    alignItems: "center",
                    borderBottom: isPriorityBoundary
                      ? "6px solid "
                      : "3px solid",
                    paddingX: 1,
                    borderTopLeftRadius:
                      isPriorityGroupStart || isNonPriorityGroupStart ? 8 : 0,
                    borderTopRightRadius:
                      isPriorityGroupStart || isNonPriorityGroupStart ? 8 : 0,
                    borderBottomLeftRadius:
                      isPriorityGroupEnd || isNonPriorityGroupEnd || isLastNote
                        ? 12
                        : 0,
                    borderBottomRightRadius:
                      isPriorityGroupEnd || isNonPriorityGroupEnd || isLastNote
                        ? 12
                        : 0,
                    borderColor: isPriorityBoundary
                      ? colors.grey[900]
                      : colors.grey[900],
                    overflow: "hidden",
                    bgcolor: shouldHighlightRecentEdit
                      ? "rgba(76, 175, 80, 0.18)"
                      : isPrioritary
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
                    <Tooltip
                      title={category ? category.name : "Assign a label"}
                      arrow
                    >
                      <IconButton
                        aria-label={`Change label for ${note.text}`}
                        size="small"
                        onClick={(event: MouseEvent<HTMLElement>) =>
                          openCategoryMenu(event, note)
                        }
                        sx={{
                          p: 0.5,
                          color: category ? "inherit" : colors.blueGrey[500],
                        }}
                      >
                        {category ? (
                          <LabelIcon
                            icon={category.icon}
                            color={category.color}
                            size={0.8}
                          />
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
                        ref={(element) => updateOverflowState(note.id, element)}
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
                          WebkitLineClamp: overflowingnoteIds.has(note.id)
                            ? 4
                            : 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {note.text.split("\n").map((row, rowIndex) => {
                          const checkboxMatch = row.match(CHECKBOX_ROW_PATTERN);
                          const isChecked =
                            checkboxMatch?.[2]?.toLowerCase() === "x";
                          const rowText = checkboxMatch?.[3] ?? row;
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
                                  onChange={() =>
                                    onToggleCheckbox(note, rowIndex)
                                  }
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
                                  textDecoration: isChecked
                                    ? "line-through"
                                    : "none",
                                }}
                              >
                                {splitTextByUrls(rowText).map(
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
                                      <span key={partIndex}>{part.value}</span>
                                    ),
                                )}
                              </Box>
                              {rowIndex < note.text.split("\n").length - 1 && (
                                <br />
                              )}
                            </Box>
                          );
                        })}
                      </Typography>
                      {expandablenoteIds.has(note.id) && (
                        <Tooltip title="Expand note" arrow>
                          <IconButton
                            aria-label={`Expand ${note.text}`}
                            size="small"
                            onClick={() => setOverflowModalnoteId(note.id)}
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
                            color:
                              isToday(note.createdAt) ||
                              note.pinned ||
                              (note.due !== undefined &&
                                (isToday(note.due) || isTomorrow(note.due))) ||
                              note.hasNotification
                                ? colors.lightGreen[400]
                                : colors.blueGrey[300],
                          }}
                        >
                          {formatTimestamp(note.createdAt)}
                          {note.hasNotification && (
                            <Tooltip
                              title="Notified"
                              aria-label={undefined}
                              arrow
                            >
                              <Box
                                component="span"
                                sx={{
                                  ml: 0.5,
                                  display: "inline-flex",
                                  color: colors.lightGreen[400],
                                }}
                              >
                                <Icon path={mdiBell} size={0.5} />
                              </Box>
                            </Tooltip>
                          )}
                          {note.pinned && (
                            <Tooltip
                              title="Pinned"
                              aria-label={undefined}
                              arrow
                            >
                              <Box
                                component="span"
                                sx={{
                                  ml: 0.5,
                                  display: "inline-flex",
                                  color: colors.lightGreen[400],
                                }}
                              >
                                <Icon path={mdiPin} size={0.6} />
                              </Box>
                            </Tooltip>
                          )}
                        </Typography>
                        {selectMode ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              textAlign: "left",
                              display: "block",
                              color: colors.blueGrey[400],
                            }}
                          >
                            #
                            {sortedNotes.length -
                              sortedNotes.findIndex(
                                (currenItem) => currenItem.id === note.id,
                              )}
                          </Typography>
                        ) : note.due !== undefined &&
                          note.due >= today.unix() ? (
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
                          setMenuAnchor({ el: event.currentTarget, note })
                        }
                        disabled={selectMode}
                      >
                        <Icon path={mdiDotsVertical} size={0.8} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
      <Menu anchorEl={menuAnchor?.el} open={!!menuAnchor} onClose={closeMenu}>
        <MenuItem onClick={() => menuAnchor && handleNotify(menuAnchor.note)}>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
              py: 1,
              px: 0.5,
            }}
          >
            <Icon path={mdiBell} size={0.7} />
          </Box>
          Notify
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuAnchor) {
              onPin(menuAnchor.note);
              closeMenu();
            }
          }}
        >
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
              py: 1,
              px: 0.5,
            }}
          >
            <Icon
              path={menuAnchor?.note.pinned ? mdiPinOff : mdiPin}
              size={0.7}
            />
          </Box>
          {menuAnchor?.note.pinned ? "Unpin" : "Pin"}
        </MenuItem>
        <Divider sx={{ m: `0 !important` }} />
        <MenuItem onClick={() => menuAnchor && handleCopy(menuAnchor.note)}>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
              py: 1,
              px: 0.5,
            }}
          >
            <Icon path={mdiContentCopy} size={0.8} />
          </Box>
          Copy
        </MenuItem>
        <MenuItem
          onClick={(event: MouseEvent<HTMLElement>) => {
            if (menuAnchor) {
              setShareMenuAnchor({
                el: event.currentTarget,
                note: menuAnchor.note,
              });
            }
          }}
        >
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
              py: 1,
              px: 0.5,
            }}
          >
            <Icon path={mdiShareVariant} size={0.7} />
          </Box>
          Share
        </MenuItem>
        {menuAnchor && getFirstUrl(menuAnchor.note.text) ? (
          <MenuItem onClick={() => handleOpen(menuAnchor.note)}>
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                mr: 1,
                py: 1,
                px: 0.5,
              }}
            >
              <Icon path={mdiOpenInNew} size={0.7} />
            </Box>
            Open
          </MenuItem>
        ) : (
          <MenuItem
            onClick={(event: MouseEvent<HTMLElement>) => {
              if (menuAnchor) {
                setSearchMenuAnchor({
                  el: event.currentTarget,
                  note: menuAnchor.note,
                  selectedText: getSelectedTextForNote(menuAnchor.note.id),
                });
              }
            }}
          >
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                mr: 1,
                py: 1,
                px: 0.5,
              }}
            >
              <Icon path={mdiMagnify} size={0.7} />
            </Box>
            Search
          </MenuItem>
        )}
        <Divider sx={{ m: `0 !important` }} />
        <MenuItem
          onClick={() => {
            if (menuAnchor) {
              openDueDateDialog(menuAnchor.note);
              closeMenu();
            }
          }}
        >
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
              py: 1,
              px: 0.5,
            }}
          >
            <Icon path={mdiCalendarClock} size={0.7} />
          </Box>
          Date
        </MenuItem>
        {false && (
          <MenuItem
            onClick={(event) => {
              if (menuAnchor) {
                setformatMenuNote(menuAnchor.note);
                setFormatMenuAnchor(event.currentTarget);
                closeMenu();
              }
            }}
          >
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                mr: 1,
                py: 1,
                px: 0.5,
              }}
            >
              <Icon path={mdiFormatListBulleted} size={0.7} />
            </Box>
            Format
          </MenuItem>
        )}
        <MenuItem onClick={() => menuAnchor && handleEdit(menuAnchor.note)}>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
              py: 1,
              px: 0.5,
            }}
          >
            <Icon path={mdiPencil} size={0.7} />
          </Box>
          Edit
        </MenuItem>
        <MenuItem onClick={() => menuAnchor && handleDelete(menuAnchor.note)}>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
              py: 1,
              px: 0.5,
            }}
          >
            <Icon path={mdiTrashCanOutline} size={0.7} />
          </Box>
          Delete
        </MenuItem>
      </Menu>
      <Menu
        anchorEl={shareMenuAnchor?.el}
        open={!!shareMenuAnchor}
        onClose={() => setShareMenuAnchor(null)}
        anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
        transformOrigin={{ horizontal: "right", vertical: "center" }}
      >
        <MenuItem
          onClick={() => shareMenuAnchor && handleShare(shareMenuAnchor.note)}
        >
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
              py: 1,
              px: 0.5,
            }}
          >
            <Icon path={mdiNoteText} size={0.7} />
          </Box>
          Text
        </MenuItem>
        <MenuItem
          onClick={() =>
            shareMenuAnchor && handleShareLink(shareMenuAnchor.note)
          }
        >
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
              py: 1,
              px: 0.5,
            }}
          >
            <Icon path={mdiLink} size={0.7} />
          </Box>
          Link
        </MenuItem>
      </Menu>
      <Menu
        anchorEl={searchMenuAnchor?.el}
        open={!!searchMenuAnchor}
        onClose={() => setSearchMenuAnchor(null)}
        anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
        transformOrigin={{ horizontal: "right", vertical: "center" }}
      >
        <MenuItem
          onClick={() =>
            searchMenuAnchor &&
            handleSearch(
              searchMenuAnchor.note,
              (query) => `https://www.google.com/search?q=${query}`,
              searchMenuAnchor.selectedText,
            )
          }
        >
          <SearchSiteIcon domain="google.com" />
          Google
        </MenuItem>
        <MenuItem
          onClick={() =>
            searchMenuAnchor &&
            handleSearch(
              searchMenuAnchor.note,
              (query) => `https://chatgpt.com/?q=${query}`,
              searchMenuAnchor.selectedText,
            )
          }
        >
          <SearchSiteIcon domain="chatgpt.com" />
          ChatGPT
        </MenuItem>
        <MenuItem
          onClick={() =>
            searchMenuAnchor &&
            handleSearch(
              searchMenuAnchor.note,
              (query) => `https://www.reddit.com/search/?q=${query}`,
              searchMenuAnchor.selectedText,
            )
          }
        >
          <SearchSiteIcon domain="reddit.com" />
          Reddit
        </MenuItem>
        <MenuItem
          onClick={() =>
            searchMenuAnchor &&
            handleSearch(
              searchMenuAnchor.note,
              (query) =>
                `https://www.youtube.com/results?search_query=${query}`,
              searchMenuAnchor.selectedText,
            )
          }
        >
          <SearchSiteIcon domain="youtube.com" />
          YouTube
        </MenuItem>
        <MenuItem
          onClick={() =>
            searchMenuAnchor &&
            handleSearch(
              searchMenuAnchor.note,
              (query) =>
                `https://www.google.com/maps/search/?api=1&query=${query}`,
              searchMenuAnchor.selectedText,
            )
          }
        >
          <SearchSiteIcon domain="maps.google.com" />
          Maps
        </MenuItem>
        <MenuItem
          onClick={() =>
            searchMenuAnchor &&
            handleSearch(
              searchMenuAnchor.note,
              (query) =>
                `https://www.instagram.com/explore/search/keyword/?q=${query}`,
              searchMenuAnchor.selectedText,
            )
          }
        >
          <SearchSiteIcon domain="instagram.com" />
          Instagram
        </MenuItem>
        <MenuItem
          onClick={() =>
            searchMenuAnchor &&
            handleSearch(
              searchMenuAnchor.note,
              (query) => `https://open.spotify.com/search/${query}`,
              searchMenuAnchor.selectedText,
            )
          }
        >
          <SearchSiteIcon domain="spotify.com" />
          Spotify
        </MenuItem>
        <MenuItem
          onClick={() =>
            searchMenuAnchor &&
            handleSearch(
              searchMenuAnchor.note,
              (query) => `https://www.amazon.es/s?k=${query}`,
              searchMenuAnchor.selectedText,
            )
          }
        >
          <SearchSiteIcon domain="amazon.es" />
          Amazon.es
        </MenuItem>
      </Menu>
      {overflowModalNote && (
        <Dialog
          open
          onClose={() => setOverflowModalnoteId(null)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle
            sx={{ position: "relative", bgcolor: colors.blueGrey[900], p: 1.5 }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Typography variant="body2">
                {(() => {
                  const category = categories.find(
                    (category) => category.id === overflowModalNote?.labelId,
                  );

                  return (
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      {category ? (
                        <LabelIcon
                          icon={category.icon}
                          color={category.color}
                          size={0.8}
                        />
                      ) : (
                        <Icon path={mdiLabelOff} size={0.8} />
                      )}
                      {category ? category.name : "no label"}
                    </Box>
                  );
                })()}
              </Typography>
            </Box>
            <Tooltip title="Close">
              <IconButton
                aria-label="Close"
                size="small"
                onClick={() => setOverflowModalnoteId(null)}
                sx={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  color: colors.blueGrey[100],
                }}
              >
                <Icon path={mdiClose} size={0.8} />
              </IconButton>
            </Tooltip>
          </DialogTitle>
          <DialogContent sx={{ bgcolor: colors.blueGrey[800], p: 2 }}>
            <Box
              sx={{
                overflowWrap: "anywhere",
                mt: 2,
                maxHeight: "calc(10 * 1.5em)",
                overflowY: "auto",
              }}
            >
              {overflowModalNote.text.split("\n").map((row, rowIndex) => {
                const checkboxMatch = row.match(CHECKBOX_ROW_PATTERN);
                const isChecked = checkboxMatch?.[2]?.toLowerCase() === "x";
                const rowText = checkboxMatch?.[3] ?? row;
                return (
                  <Box
                    key={`${rowIndex}-${row}`}
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      minHeight: "1.5em",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {checkboxMatch && (
                      <Checkbox
                        slotProps={{
                          input: {
                            "aria-labelledby": `note-text-${overflowModalNote.id}-row-${rowIndex}`,
                          },
                        }}
                        checked={isChecked}
                        onChange={() =>
                          onToggleCheckbox(overflowModalNote, rowIndex)
                        }
                        size="small"
                        sx={{ p: 0.25, mr: 0.5, mt: 0.1 }}
                      />
                    )}
                    <Typography
                      id={
                        checkboxMatch
                          ? `note-text-${overflowModalNote.id}-row-${rowIndex}`
                          : undefined
                      }
                      component="span"
                      variant="body1"
                      sx={{
                        textDecoration: isChecked ? "line-through" : "none",
                      }}
                    >
                      {rowText}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </DialogContent>
          <DialogActions
            sx={{
              bgcolor: colors.blueGrey[900],
              p: 1,
              gap: 1,
            }}
          >
            <Tooltip title="Actions">
              <IconButton
                size="small"
                onClick={(event: MouseEvent<HTMLElement>) =>
                  setMenuAnchor({
                    el: event.currentTarget,
                    note: overflowModalNote,
                  })
                }
              >
                <Icon path={mdiDotsVertical} size={0.8} />
              </IconButton>
            </Tooltip>
          </DialogActions>
        </Dialog>
      )}
      <Menu
        anchorEl={formatMenuAnchor}
        open={Boolean(formatMenuAnchor && formatMenuNote)}
        onClose={() => {
          setFormatMenuAnchor(null);
          setformatMenuNote(null);
        }}
      >
        {formatMenuNote && (
          <>
            <MenuItem
              onClick={() => {
                handleToggleBullet(formatMenuNote);
                setFormatMenuAnchor(null);
                setformatMenuNote(null);
              }}
            >
              <Box
                component="span"
                sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
              >
                <Icon path={mdiFormatListBulleted} size={0.7} />
              </Box>
              {allNonEmptyRowsBulleted(formatMenuNote.text)
                ? "Del bullets"
                : "Add bullets"}
            </MenuItem>
            <MenuItem
              onClick={() => {
                onAddCheckboxes(formatMenuNote);
                setFormatMenuAnchor(null);
                setformatMenuNote(null);
              }}
            >
              <Box
                component="span"
                sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
              >
                <Icon path={mdiCheckboxMarked} size={0.7} />
              </Box>
              {allNonEmptyRowsCheckboxes(formatMenuNote.text)
                ? "Del checkboxes"
                : "Add checkboxes"}
            </MenuItem>
          </>
        )}
      </Menu>
      <Menu
        anchorEl={categoryMenuAnchor?.el}
        open={!!categoryMenuAnchor}
        onClose={closeCategoryMenu}
      >
        <MenuItem
          autoFocus={categoryMenuAnchor?.note.labelId === null}
          selected={categoryMenuAnchor?.note.labelId === null}
          onClick={() => handleCategorySelect(null)}
          sx={{ color: colors.blueGrey[300] }}
        >
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
              color: colors.blueGrey[300],
            }}
          >
            <Icon path={mdiLabelOff} size={0.7} />
          </Box>
          {categories.length == 0 ? "no labels available" : "no label"}
        </MenuItem>
        {categories.map((category) => (
          <MenuItem
            key={category.id}
            autoFocus={categoryMenuAnchor?.note.labelId === category.id}
            selected={categoryMenuAnchor?.note.labelId === category.id}
            onClick={() => handleCategorySelect(category.id)}
          >
            <Box
              component="span"
              sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
            >
              <LabelIcon
                icon={category.icon}
                color={category.color}
                size={0.7}
              />
            </Box>
            {category.name}
          </MenuItem>
        ))}
      </Menu>
      {dueDateDialogNote && (
        <DueDateDialog
          open
          onClose={() => setdueDateDialogNote(null)}
          value={dueDateValue}
          onChange={(value) => setDueDateValue(value)}
          minDate={today}
          maxDate={endOfNextMonth}
          hour12={dueHour12}
          amPm={dueAmPm}
          minute={dueMinute}
          onHourChange={setDueHour12}
          onAmPmChange={setDueAmPm}
          onMinuteChange={setDueMinute}
          onSave={handleSaveDueDate}
          onGoogleCalendar={handleAddToGoogleCalendar}
          googleCalendarDisabled={
            !dueDateValue || !dueDateDialogNote.text.trim()
          }
          onRemove={() => {
            onDueChange(dueDateDialogNote, null);
            setdueDateDialogNote(null);
          }}
          showRemoveButton={dueDateDialogNote.due !== undefined}
          dueDaysByDate={dueDaysByDate ?? new Map()}
          noteCountsByDay={noteCountsByDay ?? new Map()}
          title="Set due date"
        />
      )}
    </Box>
  );
};

export default ItemList;
