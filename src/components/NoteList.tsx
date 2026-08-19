import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Box, Alert, Button, Divider } from "@mui/material";
import type { Label, Note, NoteFilters as noteFiltersValue } from "../types";
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
import { mdiDownload, mdiInformationOutline } from "@mdi/js";
import { Icon } from "@mdi/react";

type NoteListProps = {
  notes: Note[];
  labels: Label[];
  filters: noteFiltersValue;
  mostRecentAddedNoteId: string | null;
  mostRecentEditedNoteId: string | null;
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
  onPin: (note: Note) => void;
  onEmojiChange: (note: Note, emoji: string | null) => void;
  selectMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onInfoTips?: () => void;
  onInstall?: () => void;
};

const ROW_HEIGHT = 80;
const EXPANDED_ROW_HEIGHT = 128;
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
  note.pinned ||
  (note.due !== undefined && (isToday(note.due) || isTomorrow(note.due)));

const NoteList = ({
  notes,
  labels,
  filters,
  mostRecentAddedNoteId,
  mostRecentEditedNoteId,
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
  onPin,
  onEmojiChange,
  selectMode,
  selectedIds,
  onToggleSelect,
  onInfoTips,
  onInstall,
}: NoteListProps) => {
  const [menuAnchor, setMenuAnchor] = useState<{
    el: HTMLElement;
    note: Note;
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
        <>
          <Alert severity="info" sx={{ textAlign: "left" }}>
            {sortedNotes.length === 0 ? (
              <>
                <Box>No notes added yet</Box>
              </>
            ) : (
              "No notes match the current filters"
            )}
          </Alert>
          <Divider sx={{ mt: 2 }} />
          <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
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
        </>
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
              const label = note.labelId
                ? labelsById.get(note.labelId)
                : undefined;
              const dayIndex =
                dayIndexByDate.get(formatDate(note.createdAt)) ?? 0;
              const globalIndex = globalIndexByNoteId.get(note.id);

              const isPrioritary = isPriorityNote(note);
              const previousNote = filteredNotes[index - 1];
              const nextNote = filteredNotes[index + 1];
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
                  shouldHighlightRecentEdit={shouldHighlightRecentEdit}
                  onToggleSelect={onToggleSelect}
                  onOpenLabelMenu={openLabelMenu}
                  onToggleCheckbox={onToggleCheckbox}
                  onOpenOverflow={(id) => setOverflowModalnoteId(id)}
                  onOpenActionsMenu={(event, note) =>
                    setMenuAnchor({ el: event.currentTarget, note: note })
                  }
                  setnoteTextRef={(element) =>
                    updateOverflowState(note.id, element)
                  }
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
          hasUrl={getFirstUrl(menuAnchor.note.text) !== null}
          isPinned={!!menuAnchor.note.pinned}
          onClose={() => setMenuAnchor(null)}
          onNotify={handleNotify}
          onPin={onPin}
          onEmojiChange={onEmojiChange}
          onComplete={(note) => onDueChange(note, null)}
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
        />
      )}
      {labelMenuAnchor && (
        <LabelMenu
          anchorEl={labelMenuAnchor.el}
          labels={labels}
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
