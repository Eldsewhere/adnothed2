import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Box, Alert, Button } from "@mui/material";
import type {
  Label,
  LabelFormValues,
  Note,
  NoteFilters as noteFiltersValue,
} from "../types";
import { dateRegex, formatDate, isToday } from "../utils/formatTimestamp";
import { matchesTextFilters, parseTextFilters } from "../utils/noteFilters";
import { getFirstUrl } from "../utils/textPatterns";
import dayjs, { type Dayjs } from "dayjs";
import DueDateDialog from "./dialogs/DueDateDialog";
import NoteListRow from "./NoteListRow";
import NoteOverflowDialog from "./dialogs/NoteOverflowDialog";
import NoteActionsMenu from "./dialogs/NoteActionsMenu";
import LabelMenu from "./dialogs/LabelMenu";
import { mdiDownload, mdiImport, mdiInformationOutline } from "@mdi/js";
import { Icon } from "@mdi/react";
import NoteListAccordionHeader from "./NoteListAccordionHeader";

type NoteListProps = {
  notes: Note[];
  labels: Label[];
  labelCounts?: Map<string, number> | Record<string, number>;
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
  onToggleSpoiler: (note: Note) => void;
  onEmojiChange: (note: Note, emoji: string | null) => void;
  selectMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectMode: () => void;
  onOpenDateFilter: (event: MouseEvent<HTMLElement>) => void;
  hasDateFilter: boolean;
  onInfoTips?: () => void;
  onInstall?: () => void;
  onImportActionsClick?: (event: MouseEvent<HTMLElement>) => void;
  availableHashtags?: string[];
  onRefreshAvailableHashtags?: () => void;
  onFilterTextChange?: (value: string) => void;
  onToggleHashtagInDraft?: (tag: string) => void;
  onAppendHashtagToNote?: (note: Note, tag: string) => void;
  onRemoveHashtagFromNote?: (note: Note, tag: string) => void;
  onClearLabelFilter?: () => void;
  onClearDateRangeFilter?: () => void;
  onClearDueDateFilter?: () => void;
  hasTextFilter?: boolean;
  onClearTextFilter?: () => void;
  labelManagement?: {
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
  !note.archived &&
  !note.completed &&
  (note.pinned ||
    (note.due !== undefined && (isToday(note.due) || isTomorrow(note.due))));

const isFutureDueNote = (note: Note): boolean => {
  if (note.completed || note.archived || note.due === undefined) {
    return false;
  }

  const tomorrowStart = dayjs().add(1, "day").startOf("day").unix();
  return !isPriorityNote(note) && note.due > tomorrowStart;
};

const NoteList = ({
  notes,
  labels,
  labelCounts,
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
  onToggleSpoiler,
  onEmojiChange,
  selectMode,
  selectedIds,
  onToggleSelect,
  onToggleSelectMode,
  onOpenDateFilter,
  hasDateFilter,
  onInfoTips,
  onInstall,
  onImportActionsClick,
  availableHashtags = [],
  onRefreshAvailableHashtags,
  onFilterTextChange,
  onToggleHashtagInDraft,
  onAppendHashtagToNote,
  onRemoveHashtagFromNote,
  labelManagement,
  onClearLabelFilter,
  onClearDateRangeFilter,
  onClearDueDateFilter,
  hasTextFilter = false,
  onClearTextFilter,
}: NoteListProps) => {
  const [menuAnchor, setMenuAnchor] = useState<{
    el: HTMLElement;
    note: Note;
    openStatusPicker?: boolean;
  } | null>(null);
  const [overflowModalnoteId, setOverflowModalnoteId] = useState<string | null>(
    null,
  );
  const [revealAllSpoilers, setRevealAllSpoilers] = useState(false);
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
  const [futureDueSectionExpanded, setFutureDueSectionExpanded] =
    useState(true);
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
    () => dayjs().add(12, "month").endOf("month").startOf("day"),
    [],
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(400);

  const labelsById = useMemo(
    () => new Map(labels.map((label) => [label.id, label])),
    [labels],
  );

  const sortedNotes = useMemo(() => {
    const todayUnix = today.unix();
    const dayAfterTomorrowUnix = today.add(2, "day").unix();
    return [...notes].sort((a, b) => {
      const aPriority = isPriorityNote(a);
      const bPriority = isPriorityNote(b);
      if (aPriority !== bPriority) return aPriority ? -1 : 1;

      const aBucket = a.archived ? 3 : isFutureDueNote(a) ? 2 : 1;
      const bBucket = b.archived ? 3 : isFutureDueNote(b) ? 2 : 1;
      if (aBucket !== bBucket) return aBucket - bBucket;

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
      if (aBucket === 2 && bBucket === 2) {
        return (
          (a.due ?? Number.MAX_SAFE_INTEGER) -
          (b.due ?? Number.MAX_SAFE_INTEGER)
        );
      }

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

  const handleToggleSpoiler = (note: Note) => {
    onToggleSpoiler(note);
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
        if (filters.labelId && note.labelId !== filters.labelId) {
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
      ...new Set(
        filteredNotes.map((note) =>
          isFutureDueNote(note) && note.due !== undefined
            ? formatDate(note.due)
            : formatDate(note.createdAt),
        ),
      ),
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
      (note) =>
        !note.archived && !isPriorityNote(note) && !isFutureDueNote(note),
    );
    if (firstIndex === -1) {
      return null;
    }
    const lastIndex = filteredNotes.findLastIndex(
      (note) =>
        !note.archived && !isPriorityNote(note) && !isFutureDueNote(note),
    );
    return { firstIndex, lastIndex };
  }, [filteredNotes]);

  const hasSpoilerNotesAfterFilters = useMemo(
    () => filteredNotes.some((note) => note.spoiler),
    [filteredNotes],
  );

  const notesSectionCount = notesSectionRange
    ? notesSectionRange.lastIndex - notesSectionRange.firstIndex + 1
    : 0;

  const futureDueSectionRange = useMemo(() => {
    const firstIndex = filteredNotes.findIndex(
      (note) => !note.archived && isFutureDueNote(note),
    );
    if (firstIndex === -1) {
      return null;
    }
    const lastIndex = filteredNotes.findLastIndex(
      (note) => !note.archived && isFutureDueNote(note),
    );
    return { firstIndex, lastIndex };
  }, [filteredNotes]);

  const futureDueSectionCount = futureDueSectionRange
    ? futureDueSectionRange.lastIndex - futureDueSectionRange.firstIndex + 1
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

  const isListInteractionDisabled = editingNoteId !== null;

  const displayItems = useMemo(() => {
    const hasNotesSection = notesSectionRange !== null;
    const hasFutureDueSection = futureDueSectionRange !== null;
    const hasArchivedSection = archivedSectionRange !== null;

    if (!hasNotesSection && !hasFutureDueSection && !hasArchivedSection) {
      return filteredNotes.map((note, index) => ({
        type: "note" as const,
        key: `note-${note.id}`,
        note,
        index,
      }));
    }

    const items: Array<{
      type: "header" | "note" | "footer";
      key: string;
      note?: Note;
      index?: number;
    }> = [];

    const addNotes = (
      matchesSection: (note: Note) => boolean,
      headerKey?: string,
      isExpanded = true,
    ) => {
      const sectionNotes = filteredNotes.filter(matchesSection);
      if (sectionNotes.length === 0) return;
      if (headerKey) {
        items.push({ type: "header", key: headerKey });
      }
      if (!isExpanded) return;
      sectionNotes.forEach((note) => {
        items.push({
          type: "note",
          key: `note-${note.id}`,
          note,
          index: filteredNotes.indexOf(note),
        });
      });
    };

    addNotes((note) => isPriorityNote(note));

    const isMostRecentAdditionScheduled = filteredNotes.some(
      (note) =>
        note.id === mostRecentAddedNoteId &&
        !note.archived &&
        isFutureDueNote(note),
    );
    const ordinaryNotes = (note: Note) =>
      !note.archived && !isPriorityNote(note) && !isFutureDueNote(note);
    const futureScheduledNotes = (note: Note) =>
      !note.archived && isFutureDueNote(note);

    if (isMostRecentAdditionScheduled) {
      addNotes(
        futureScheduledNotes,
        "future-due-section-header",
        futureDueSectionExpanded,
      );
      addNotes(ordinaryNotes, "notes-section-header", notesSectionExpanded);
    } else {
      addNotes(ordinaryNotes, "notes-section-header", notesSectionExpanded);
      addNotes(
        futureScheduledNotes,
        "future-due-section-header",
        futureDueSectionExpanded,
      );
    }

    addNotes(
      (note) => Boolean(note.archived) && !isPriorityNote(note),
      "archived-section-header",
      archivedSectionExpanded,
    );

    if (onImportActionsClick) {
      items.push({ type: "footer", key: "import-actions-footer" });
    }

    return items;
  }, [
    archivedSectionExpanded,
    archivedSectionRange,
    filteredNotes,
    futureDueSectionExpanded,
    futureDueSectionRange,
    mostRecentAddedNoteId,
    notesSectionExpanded,
    notesSectionRange,
    onImportActionsClick,
  ]);

  const rowHeights = displayItems.map((item) =>
    item.type === "header"
      ? ARCHIVED_SECTION_HEADER_HEIGHT
      : item.type === "footer"
        ? 52
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
            maxHeight: "calc(100vh - 240px)",
            minHeight: 200,
            overflowY: "auto",
            position: "relative",
            scrollbarWidth: "thin",
            "&::-webkit-scrollbar": {
              width: 8,
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "rgba(148, 163, 184, 0.45)",
              borderRadius: 999,
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "rgba(15, 23, 42, 0.2)",
            },
          }}
        >
          <Box
            sx={{
              position: "relative",
              height: 36,
            }}
          >
            <NoteListAccordionHeader
              label="Notes"
              count={0}
              isExpanded={false}
              tooltip="Notes"
              onToggle={() => {}}
              selectedLabel={
                filters.labelId ? labelsById.get(filters.labelId) : undefined
              }
              onClearLabelFilter={onClearLabelFilter}
              hasStartOrEndDateFilter={Boolean(filters.date || filters.endDate)}
              activeDateRangeLabel={
                [filters.date, filters.endDate].filter(Boolean).join(" → ") ||
                null
              }
              onClearDateRangeFilter={onClearDateRangeFilter}
              hasDueDateFilter={Boolean(
                filters.dueDate || filters.hasDue || filters.weekday !== null,
              )}
              activeDueDateLabel={filters.weekday || filters.dueDate || null}
              onClearDueDateFilter={onClearDueDateFilter}
              hasTextFilter={hasTextFilter}
              onClearTextFilter={onClearTextFilter}
              selectMode={selectMode}
              selectedCount={selectedIds.size}
              onToggleSelectMode={onToggleSelectMode}
              selectDisabled
              onOpenDateFilter={onOpenDateFilter}
              hasDateFilter={hasDateFilter}
              dateFilterDisabled
            />
          </Box>
          <Alert severity="info">
            {sortedNotes.length === 0
              ? "No notes added yet"
              : "No notes match the current filters"}
          </Alert>
          <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
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
            maxHeight: "calc(100vh - 240px)",
            minHeight: 200,
            overflowY: "auto",
            position: "relative",
            scrollbarWidth: "thin",
            "&::-webkit-scrollbar": {
              width: 8,
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "rgba(148, 163, 184, 0.45)",
              borderRadius: 999,
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "rgba(15, 23, 42, 0.2)",
            },
          }}
        >
          <Box sx={{ height: totalHeight, position: "relative" }}>
            {visibleNotes.map((item, i) => {
              const index = startIndex + i;

              if (item.type === "header") {
                const isArchivedHeader = item.key === "archived-section-header";
                const isFutureDueHeader =
                  item.key === "future-due-section-header";
                const isExpanded = isArchivedHeader
                  ? archivedSectionExpanded
                  : isFutureDueHeader
                    ? futureDueSectionExpanded
                    : notesSectionExpanded;
                const count = isArchivedHeader
                  ? archivedSectionCount
                  : isFutureDueHeader
                    ? futureDueSectionCount
                    : notesSectionCount;
                const label = isArchivedHeader
                  ? "Archived"
                  : isFutureDueHeader
                    ? "Scheduled"
                    : "Notes";
                const tooltip = isArchivedHeader
                  ? archivedSectionExpanded
                    ? "Collapse archived notes"
                    : "Expand archived notes"
                  : isFutureDueHeader
                    ? futureDueSectionExpanded
                      ? "Collapse scheduled notes"
                      : "Expand scheduled notes"
                    : notesSectionExpanded
                      ? "Collapse notes"
                      : "Expand notes";
                const onToggle = isArchivedHeader
                  ? () => setArchivedSectionExpanded((value) => !value)
                  : isFutureDueHeader
                    ? () => setFutureDueSectionExpanded((value) => !value)
                    : () => setNotesSectionExpanded((value) => !value);

                const selectedLabel =
                  item.key === "notes-section-header" && filters.labelId
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
                  item.key === "notes-section-header" ||
                  item.key === "future-due-section-header"
                    ? filters.weekday || filters.dueDate || null
                    : null;
                const hasDueDateFilter =
                  (item.key === "notes-section-header" ||
                    item.key === "future-due-section-header") &&
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
                    }}
                  >
                    <NoteListAccordionHeader
                      label={label}
                      count={count}
                      isExpanded={isExpanded}
                      tooltip={tooltip}
                      onToggle={onToggle}
                      selectedLabel={selectedLabel}
                      onClearLabelFilter={onClearLabelFilter}
                      hasStartOrEndDateFilter={hasStartOrEndDateFilter}
                      activeDateRangeLabel={activeDateRangeLabel}
                      onClearDateRangeFilter={onClearDateRangeFilter}
                      hasDueDateFilter={hasDueDateFilter}
                      activeDueDateLabel={activeDueDateLabel}
                      onClearDueDateFilter={onClearDueDateFilter}
                      hasTextFilter={hasTextFilter}
                      onClearTextFilter={onClearTextFilter}
                      revealAllSpoilers={
                        item.key === "notes-section-header" && revealAllSpoilers
                      }
                      onToggleRevealAllSpoilers={
                        item.key === "notes-section-header" &&
                        hasSpoilerNotesAfterFilters
                          ? () => setRevealAllSpoilers((value) => !value)
                          : undefined
                      }
                      selectMode={selectMode}
                      selectedCount={selectedIds.size}
                      onToggleSelectMode={
                        item.key === "notes-section-header"
                          ? onToggleSelectMode
                          : undefined
                      }
                      onOpenDateFilter={
                        item.key === "notes-section-header"
                          ? onOpenDateFilter
                          : undefined
                      }
                      hasDateFilter={hasDateFilter}
                      dateFilterDisabled={notes.length === 0 || selectMode}
                      selectDisabled={notes.length === 0}
                      interactionDisabled={isListInteractionDisabled}
                    />
                  </Box>
                );
              }

              if (item.type === "footer") {
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
                      justifyContent: "center",
                    }}
                  >
                    <Button
                      variant="outlined"
                      startIcon={<Icon path={mdiImport} size={0.9} />}
                      onClick={(event) => onImportActionsClick?.(event)}
                      disabled={isListInteractionDisabled}
                      sx={{
                        mt: 1,
                      }}
                    >
                      Import / Export
                    </Button>
                  </Box>
                );
              }

              const note = item.note!;
              const label = note.labelId
                ? labelsById.get(note.labelId)
                : undefined;
              const zebraDate =
                isFutureDueNote(note) && note.due !== undefined
                  ? formatDate(note.due)
                  : formatDate(note.createdAt);
              const dayIndex = dayIndexByDate.get(zebraDate) ?? 0;
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
                  isInteractionDisabled={isListInteractionDisabled}
                  shouldHighlightRecentEdit={shouldHighlightRecentEdit}
                  revealAllSpoilers={revealAllSpoilers}
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
                  onToggleHashtagInDraft={onToggleHashtagInDraft}
                  onAppendHashtagToNote={onAppendHashtagToNote}
                  onRemoveHashtagFromNote={onRemoveHashtagFromNote}
                  onEmojiChange={onEmojiChange}
                  openDueDateDialog={openDueDateDialog}
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
          onHashtagPickerOpen={onRefreshAvailableHashtags}
          openStatusPicker={menuAnchor.openStatusPicker}
          hasUrl={getFirstUrl(menuAnchor.note.text) !== null}
          isPinned={!!menuAnchor.note.pinned}
          onClose={() => setMenuAnchor(null)}
          onNotify={handleNotify}
          onPin={onPin}
          onArchive={onArchive}
          onToggleSpoiler={handleToggleSpoiler}
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
          availableHashtags={availableHashtags}
          filterText={filters.text}
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
          onCreateLabel={
            labelManagement
              ? () => {
                  labelManagement.onCancelEdit();
                  closeLabelMenu();
                }
              : undefined
          }
          management={labelManagement}
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
          title="Schedule note"
        />
      )}
    </Box>
  );
};

export default NoteList;
