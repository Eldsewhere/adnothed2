import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Box, Alert, Button, Divider, Tooltip } from "@mui/material";
import type {
  Label,
  Note,
  NoteFilters as noteFiltersValue,
  Status,
} from "../types";
import { dateRegex, formatDate, isToday } from "../utils/formatTimestamp";
import {
  matchesTextFilters,
  NO_LABEL_FILTER_VALUE,
  parseTextFilters,
} from "../utils/noteFilters";
import { getFirstUrl } from "../utils/textPatterns";
import dayjs, { type Dayjs } from "dayjs";
import DueDateDialog from "./dialogs/DueDateDialog";
import NoteListRow from "./NoteListRow";
import NoteOverflowDialog from "./dialogs/NoteOverflowDialog";
import NoteActionsMenu from "./dialogs/NoteActionsMenu";
import LabelMenu from "./dialogs/LabelMenu";
import {
  mdiCalendar,
  mdiCalendarClock,
  mdiChevronDown,
  mdiChevronUp,
  mdiDownload,
  mdiInformationOutline,
} from "@mdi/js";
import { Icon } from "@mdi/react";
import LabelIcon from "./ui/LabelIcon";

type NoteListProps = {
  notes: Note[];
  labels: Label[];
  labelCounts?: Map<string, number> | Record<string, number>;
  statuses: Status[];
  filters: noteFiltersValue;
  mostRecentAddedNoteId: string | null;
  mostRecentEditedNoteId: string | null;
  editingNoteId: string | null;
  dueDaysByDate?: Map<string, number>;
  noteCountsByDay?: Map<string, number>;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  onCopy: (note: Note) => void;
  onClone: (note: Note) => void;
  onShareLink: (note: Note) => void;
  onToggleBullet: (note: Note) => void;
  onAddCheckboxes: (note: Note) => void;
  onToggleCheckbox: (note: Note, rowIndex: number) => void;
  onNotify: (note: Note) => void;
  onLabelChange: (note: Note, labelId: string | null) => void;
  onDueChange: (note: Note, due: number | null) => void;
  onComplete: (note: Note) => void;
  onPin: (note: Note) => void;
  onArchive: (note: Note) => void;
  onEmojiChange: (note: Note, emoji: string | null) => void;
  selectMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onInfoTips?: () => void;
  onInstall?: () => void;
  availableHashtags?: string[];
  onRefreshAvailableHashtags?: () => void;
  onFilterTextChange?: (value: string) => void;
  onToggleHashtagFilter?: (tag: string) => void;
  onToggleHashtagInDraft?: (tag: string) => void;
  onAppendHashtagToNote?: (note: Note, tag: string) => void;
  onRemoveHashtagFromNote?: (note: Note, tag: string) => void;
};

const ROW_HEIGHT = 80;
const EXPANDED_ROW_HEIGHT = 128;
const ARCHIVED_SECTION_HEADER_HEIGHT = 36;
const OVERSCAN = 6;
const CHECKBOX_ROW_PATTERN = /^(\[ ?([xX])? ?\])\s?(.*)$/;

const getSearchQuery = (text: string): string =>
  text
    .split("\n")
    .map((row) =>
      row.trimStart().replace(CHECKBOX_ROW_PATTERN, "$3").replace(/^•\s?/, ""),
    )
    .join("\n")
    .trim();

function isTomorrow(date: number): boolean {
  const target = dayjs.unix(date).startOf("day");
  const tomorrow = dayjs().add(1, "day").startOf("day");

  return target.isSame(tomorrow, "day");
}

const isPriorityNote = (note: Note): boolean =>
  !note.completed &&
  (note.pinned ||
    (note.due !== undefined && (isToday(note.due) || isTomorrow(note.due))));

const NoteList = ({
  notes,
  labels,
  labelCounts,
  statuses,
  filters,
  mostRecentAddedNoteId,
  mostRecentEditedNoteId,
  editingNoteId,
  dueDaysByDate,
  noteCountsByDay,
  onEdit,
  onDelete,
  onCopy,
  onClone,
  onShareLink,
  onToggleCheckbox,
  onNotify,
  onLabelChange,
  onDueChange,
  onComplete,
  onPin,
  onArchive,
  onEmojiChange,
  selectMode,
  selectedIds,
  onToggleSelect,
  onInfoTips,
  onInstall,
  availableHashtags = [],
  onRefreshAvailableHashtags,
  onFilterTextChange,
  onToggleHashtagFilter,
  onToggleHashtagInDraft,
  onAppendHashtagToNote,
  onRemoveHashtagFromNote,
}: NoteListProps) => {
  const [menuAnchor, setMenuAnchor] = useState<{
    el: HTMLElement;
    note: Note;
    openStatusPicker?: boolean;
  } | null>(null);
  const [overflowModalnoteId, setOverflowModalnoteId] = useState<string | null>(
    null,
  );
  const [overflowingnoteIds, setOverflowingNoteIds] = useState<Set<string>>(
    new Set(),
  );
  const [expandablenoteIds, setExpandableNoteIds] = useState<Set<string>>(
    new Set(),
  );
  const [labelMenuAnchor, setLabelMenuAnchor] = useState<{
    el: HTMLElement;
    note: Note;
  } | null>(null);
  const [notesSectionExpanded, setNotesSectionExpanded] = useState(true);
  const [archivedSectionExpanded, setArchivedSectionExpanded] = useState(true);
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

  const labelsById = useMemo(
    () => new Map(labels.map((label) => [label.id, label])),
    [labels],
  );
  const statusByEmoji = useMemo(
    () => new Map(statuses.map((status) => [status.emoji, status])),
    [statuses],
  );

  const sortedNotes = useMemo(() => {
    const todayUnix = today.unix();
    const dayAfterTomorrowUnix = today.add(2, "day").unix();
    return [...notes].sort((a, b) => {
      const aPriority = isPriorityNote(a);
      const bPriority = isPriorityNote(b);
      if (aPriority !== bPriority) return aPriority ? -1 : 1;

      if (a.archived !== b.archived) {
        if (aPriority || bPriority) return 0;
        return a.archived ? 1 : -1;
      }

      const aPinned = a.pinned ? 1 : 0;
      const bPinned = b.pinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      const aIsDueSoon =
        !a.completed &&
        a.due !== undefined &&
        a.due >= todayUnix &&
        a.due < dayAfterTomorrowUnix;
      const bIsDueSoon =
        !b.completed &&
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

  const handleClone = (note: Note) => {
    onClone(note);
    closeMenu();
  };

  const handleNotify = (note: Note) => {
    onNotify(note);
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
    setOverflowingNoteIds((currentIds) => {
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

  const openLabelMenu = (event: MouseEvent<HTMLElement>, note: Note) => {
    setLabelMenuAnchor({ el: event.currentTarget, note });
  };

  const closeLabelMenu = () => setLabelMenuAnchor(null);

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

  const handleLabelSelect = (labelId: string | null) => {
    if (!labelMenuAnchor) {
      return;
    }
    onLabelChange(labelMenuAnchor.note, labelId);
    closeLabelMenu();
  };

  const parsedTextFilters = useMemo(
    () => parseTextFilters(filters.text, selectMode),
    [filters.text, selectMode],
  );

  const filteredNotes = useMemo(
    () =>
      sortedNotes.filter((note, index) => {
        if (filters.labelId === NO_LABEL_FILTER_VALUE) {
          if (note.labelId !== null) {
            return false;
          }
        } else if (filters.labelId && note.labelId !== filters.labelId) {
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
            note.pinned,
            note.emoji,
            note.archived,
            note.completed,
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

  const globalIndexByNoteId = useMemo(
    () =>
      new Map(
        sortedNotes.map((note, index) => [note.id, sortedNotes.length - index]),
      ),
    [sortedNotes],
  );

  const notesSectionRange = useMemo(() => {
    const firstIndex = filteredNotes.findIndex(
      (note) => !note.archived && !isPriorityNote(note),
    );
    if (firstIndex === -1) {
      return null;
    }
    const lastIndex = filteredNotes.findLastIndex(
      (note) => !note.archived && !isPriorityNote(note),
    );
    return { firstIndex, lastIndex };
  }, [filteredNotes]);

  const notesSectionCount = notesSectionRange
    ? notesSectionRange.lastIndex - notesSectionRange.firstIndex + 1
    : 0;

  const archivedSectionRange = useMemo(() => {
    const firstIndex = filteredNotes.findIndex(
      (note) => note.archived && !isPriorityNote(note),
    );
    if (firstIndex === -1) {
      return null;
    }
    const lastIndex = filteredNotes.findLastIndex(
      (note) => note.archived && !isPriorityNote(note),
    );
    return { firstIndex, lastIndex };
  }, [filteredNotes]);

  const archivedSectionCount = archivedSectionRange
    ? archivedSectionRange.lastIndex - archivedSectionRange.firstIndex + 1
    : 0;

  const displayItems = useMemo(() => {
    const hasNotesSection = notesSectionRange !== null;
    const hasArchivedSection = archivedSectionRange !== null;

    if (!hasNotesSection && !hasArchivedSection) {
      return filteredNotes.map((note, index) => ({
        type: "note" as const,
        key: `note-${note.id}`,
        note,
        index,
      }));
    }

    const items: Array<{
      type: "header" | "note";
      key: string;
      note?: Note;
      index?: number;
    }> = [];

    filteredNotes.forEach((note, index) => {
      const isNotesSectionNonPriority = !note.archived && !isPriorityNote(note);
      const isArchivedNonPriority = note.archived && !isPriorityNote(note);

      if (notesSectionRange && index === notesSectionRange.firstIndex) {
        items.push({
          type: "header",
          key: "notes-section-header",
        });
      }
      if (archivedSectionRange && index === archivedSectionRange.firstIndex) {
        items.push({
          type: "header",
          key: "archived-section-header",
        });
      }
      if (!notesSectionExpanded && isNotesSectionNonPriority) {
        return;
      }
      if (!archivedSectionExpanded && isArchivedNonPriority) {
        return;
      }
      items.push({
        type: "note",
        key: `note-${note.id}`,
        note,
        index,
      });
    });

    return items;
  }, [
    archivedSectionExpanded,
    archivedSectionRange,
    filteredNotes,
    notesSectionExpanded,
    notesSectionRange,
  ]);

  const rowHeights = displayItems.map((item) =>
    item.type === "header"
      ? ARCHIVED_SECTION_HEADER_HEIGHT
      : overflowingnoteIds.has(item.note!.id)
        ? EXPANDED_ROW_HEIGHT
        : ROW_HEIGHT,
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
    (firstVisibleIndex === -1 ? displayItems.length : firstVisibleIndex) -
      OVERSCAN,
  );
  const endIndex = Math.min(
    displayItems.length,
    (lastVisibleIndex === -1 ? displayItems.length : lastVisibleIndex + 1) +
      OVERSCAN,
  );
  const visibleNotes = displayItems.slice(startIndex, endIndex);

  return (
    <Box>
      {filteredNotes.length === 0 ? (
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
          <Box
            sx={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 1.5,
              py: 0.75,
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "rgba(255,255,255,0.03)",
            }}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                fontSize: "0.82rem",
                fontWeight: 700,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              <Icon path={mdiChevronDown} size={0.7} />
              Notes (0)
            </Box>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.75,
              }}
            >
              {filters.labelId && filters.labelId !== NO_LABEL_FILTER_VALUE && (
                <Tooltip
                  title={`Label filter: ${labelsById.get(filters.labelId)?.name ?? "Selected label"}`}
                  arrow
                >
                  <Box sx={{ display: "inline-flex", alignItems: "center" }}>
                    <LabelIcon
                      icon={
                        labelsById.get(filters.labelId)?.icon ?? {
                          name: "",
                          label: "Label",
                          path: mdiInformationOutline,
                        }
                      }
                      color={labelsById.get(filters.labelId)?.color}
                      size={0.65}
                    />
                  </Box>
                </Tooltip>
              )}
              {(filters.date || filters.endDate) && (
                <Tooltip
                  title={
                    [filters.date, filters.endDate]
                      .filter(Boolean)
                      .join(" → ") || "Date range filter"
                  }
                  arrow
                >
                  <Box sx={{ display: "inline-flex", alignItems: "center" }}>
                    <Icon path={mdiCalendar} size={0.7} />
                  </Box>
                </Tooltip>
              )}
              {(filters.dueDate ||
                filters.hasDue ||
                filters.weekday !== null) && (
                <Tooltip
                  title={
                    filters.weekday || filters.dueDate || "Due date filter"
                  }
                  arrow
                >
                  <Box sx={{ display: "inline-flex", alignItems: "center" }}>
                    <Icon path={mdiCalendarClock} size={0.7} />
                  </Box>
                </Tooltip>
              )}
            </Box>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 1.25,
              color: "text.secondary",
              backgroundColor: "rgba(96, 165, 250, 0.08)",
              borderLeft: "3px solid rgba(96, 165, 250, 0.6)",
            }}
          >
            <Icon path={mdiInformationOutline} size={0.85} color="info.main" />
            <Box sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
              {sortedNotes.length === 0
                ? "No notes added yet"
                : "No notes match the current filters"}
            </Box>
          </Box>
          <Box
            sx={{ mt: 0.5, display: "flex", gap: 1, flexWrap: "wrap", px: 1.5 }}
          >
            {onInfoTips && (
              <Button
                startIcon={<Icon path={mdiInformationOutline} size={0.9} />}
                variant="outlined"
                size="small"
                onClick={onInfoTips}
              >
                Info tips
              </Button>
            )}
            {onInstall && (
              <Button
                startIcon={<Icon path={mdiDownload} size={0.9} />}
                variant="outlined"
                size="small"
                onClick={onInstall}
              >
                Install app
              </Button>
            )}
          </Box>
        </Box>
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
            {visibleNotes.map((item, i) => {
              const index = startIndex + i;

              if (item.type === "header") {
                const isArchivedHeader = item.key === "archived-section-header";
                const isNotesHeader = item.key === "notes-section-header";
                const isExpanded = isArchivedHeader
                  ? archivedSectionExpanded
                  : notesSectionExpanded;
                const count = isArchivedHeader
                  ? archivedSectionCount
                  : notesSectionCount;
                const label = isArchivedHeader ? "Archived" : "Notes";
                const tooltip = isArchivedHeader
                  ? archivedSectionExpanded
                    ? "Collapse archived notes"
                    : "Expand archived notes"
                  : notesSectionExpanded
                    ? "Collapse notes"
                    : "Expand notes";
                const onToggle = isArchivedHeader
                  ? () => setArchivedSectionExpanded((value) => !value)
                  : () => setNotesSectionExpanded((value) => !value);

                const selectedLabel =
                  item.key === "notes-section-header" &&
                  filters.labelId &&
                  filters.labelId !== NO_LABEL_FILTER_VALUE
                    ? labelsById.get(filters.labelId)
                    : undefined;
                const activeDateRangeLabel =
                  item.key === "notes-section-header"
                    ? [filters.date, filters.endDate]
                        .filter(Boolean)
                        .join(" → ") || null
                    : null;
                const hasStartOrEndDateFilter =
                  item.key === "notes-section-header" &&
                  Boolean(filters.date || filters.endDate);
                const activeDueDateLabel =
                  item.key === "notes-section-header"
                    ? filters.weekday || filters.dueDate || null
                    : null;
                const hasDueDateFilter =
                  item.key === "notes-section-header" &&
                  Boolean(
                    filters.dueDate ||
                    filters.hasDue ||
                    filters.weekday !== null,
                  );

                return (
                  <Box
                    key={item.key}
                    sx={{
                      position: "absolute",
                      top: rowOffsets[index] - rowHeights[index],
                      left: 0,
                      right: 0,
                      height: rowHeights[index],
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      px: 1.5,
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 0,
                      backgroundColor: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <Tooltip title={tooltip} arrow>
                      <Box
                        component="button"
                        type="button"
                        onClick={onToggle}
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.5,
                          background: "transparent",
                          border: "none",
                          color: "inherit",
                          cursor: "pointer",
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          letterSpacing: 0.4,
                          textTransform: "uppercase",
                          p: 0,
                        }}
                      >
                        <Icon
                          path={isExpanded ? mdiChevronUp : mdiChevronDown}
                          size={0.7}
                        />
                        {label} ({count})
                      </Box>
                    </Tooltip>
                    {(selectedLabel ||
                      hasStartOrEndDateFilter ||
                      hasDueDateFilter) && (
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 0.75,
                        }}
                      >
                        {selectedLabel && (
                          <Tooltip
                            title={`Label filter: ${selectedLabel.name}`}
                            arrow
                          >
                            <Box
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <LabelIcon
                                icon={selectedLabel.icon}
                                color={selectedLabel.color}
                                size={0.65}
                              />
                            </Box>
                          </Tooltip>
                        )}
                        {hasStartOrEndDateFilter && (
                          <Tooltip
                            title={
                              activeDateRangeLabel
                                ? `Date range filter: ${activeDateRangeLabel}`
                                : "Date range filter"
                            }
                            arrow
                          >
                            <Box
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Icon path={mdiCalendar} size={0.7} />
                            </Box>
                          </Tooltip>
                        )}
                        {hasDueDateFilter && (
                          <Tooltip
                            title={
                              activeDueDateLabel
                                ? `Due date filter: ${activeDueDateLabel}`
                                : "Due date filter"
                            }
                            arrow
                          >
                            <Box
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Icon path={mdiCalendarClock} size={0.7} />
                            </Box>
                          </Tooltip>
                        )}
                      </Box>
                    )}
                  </Box>
                );
              }

              const note = item.note!;
              const label = note.labelId
                ? labelsById.get(note.labelId)
                : undefined;
              const dayIndex =
                dayIndexByDate.get(formatDate(note.createdAt)) ?? 0;
              const globalIndex = globalIndexByNoteId.get(note.id);

              const isPrioritary = isPriorityNote(note);
              const previousNote = filteredNotes[item.index! - 1];
              const nextNote = filteredNotes[item.index! + 1];
              const isPriorityGroupStart =
                isPrioritary &&
                (!previousNote || !isPriorityNote(previousNote));
              const isPriorityGroupEnd =
                isPrioritary && (!nextNote || !isPriorityNote(nextNote));
              const isNonPriorityGroupStart =
                !isPrioritary &&
                (!previousNote || isPriorityNote(previousNote));
              const isNonPriorityGroupEnd =
                !isPrioritary && (!nextNote || isPriorityNote(nextNote));
              const isLastNote = item.index === filteredNotes.length - 1;
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
              const isEditingThisNote = editingNoteId === note.id;
              const isThisNoteMenuOpen =
                menuAnchor?.note.id === note.id ||
                labelMenuAnchor?.note.id === note.id;

              return (
                <NoteListRow
                  key={note.id}
                  top={rowOffsets[index] - rowHeights[index]}
                  height={rowHeights[index]}
                  note={note}
                  label={label}
                  status={
                    note.emoji ? statusByEmoji.get(note.emoji) : undefined
                  }
                  isPriority={isPrioritary}
                  isLastNote={isLastNote}
                  isPriorityBoundary={isPriorityBoundary}
                  isPriorityGroupStart={isPriorityGroupStart}
                  isPriorityGroupEnd={isPriorityGroupEnd}
                  isNonPriorityGroupStart={isNonPriorityGroupStart}
                  isNonPriorityGroupEnd={isNonPriorityGroupEnd}
                  dayIndex={dayIndex}
                  selectMode={selectMode}
                  globalIndex={globalIndex}
                  selectedIds={selectedIds}
                  isOverflowing={overflowingnoteIds.has(note.id)}
                  isExpandable={expandablenoteIds.has(note.id)}
                  isEditing={isEditingThisNote}
                  isMenuOpen={isThisNoteMenuOpen}
                  shouldHighlightRecentEdit={shouldHighlightRecentEdit}
                  onToggleSelect={onToggleSelect}
                  onOpenLabelMenu={openLabelMenu}
                  onToggleCheckbox={onToggleCheckbox}
                  onOpenOverflow={(id) => setOverflowModalnoteId(id)}
                  onPin={onPin}
                  onArchive={onArchive}
                  onOpenActionsMenu={(event, note, openStatusPicker) =>
                    setMenuAnchor({
                      el: event.currentTarget,
                      note,
                      openStatusPicker,
                    })
                  }
                  setnoteTextRef={(element) =>
                    updateOverflowState(note.id, element)
                  }
                  availableHashtags={availableHashtags}
                  filterText={filters.text}
                  onFilterTextChange={onFilterTextChange}
                  onToggleHashtagFilter={onToggleHashtagFilter}
                  onToggleHashtagInDraft={onToggleHashtagInDraft}
                  onAppendHashtagToNote={onAppendHashtagToNote}
                  onRemoveHashtagFromNote={onRemoveHashtagFromNote}
                />
              );
            })}
          </Box>
        </Box>
      )}
      {menuAnchor && (
        <NoteActionsMenu
          anchorEl={menuAnchor.el}
          note={menuAnchor.note}
          statuses={statuses}
          onHashtagPickerOpen={onRefreshAvailableHashtags}
          openStatusPicker={menuAnchor.openStatusPicker}
          hasUrl={getFirstUrl(menuAnchor.note.text) !== null}
          isPinned={!!menuAnchor.note.pinned}
          onClose={() => setMenuAnchor(null)}
          onNotify={handleNotify}
          onPin={onPin}
          onArchive={onArchive}
          onEmojiChange={onEmojiChange}
          onComplete={onComplete}
          onCopy={handleCopy}
          onClone={handleClone}
          onShareText={handleShare}
          onShareLink={handleShareLink}
          onOpen={handleOpen}
          onSearch={handleSearch}
          getSelectedText={getSelectedTextForNote}
          onDate={openDueDateDialog}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAppendHashtagToNote={onAppendHashtagToNote}
        />
      )}
      {overflowModalNote && (
        <NoteOverflowDialog
          open
          note={overflowModalNote}
          labels={labels}
          onClose={() => setOverflowModalnoteId(null)}
          onToggleCheckbox={onToggleCheckbox}
          onOpenActionsMenu={(event: MouseEvent<HTMLElement>) =>
            setMenuAnchor({
              el: event.currentTarget,
              note: overflowModalNote,
            })
          }
          onRemoveHashtagFromNote={onRemoveHashtagFromNote}
        />
      )}
      {labelMenuAnchor && (
        <LabelMenu
          anchorEl={labelMenuAnchor.el}
          labels={labels}
          labelCounts={labelCounts}
          onClose={closeLabelMenu}
          onSelect={(val) => handleLabelSelect(val)}
          selected={labelMenuAnchor?.note.labelId}
        />
      )}
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

export default NoteList;
