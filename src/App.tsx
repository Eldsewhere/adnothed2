import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  colors,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Tooltip,
} from "@mui/material";
import { Icon } from "@mdi/react";
import {
  mdiCancel,
  mdiCheckboxMultipleMarked,
  mdiFolderMove,
  mdiTrashCanOutline,
  mdiCalendar,
  mdiNoteText,
  mdiLabelMultiple,
  mdiFileImport,
} from "@mdi/js";
import LabelForm from "./components/LabelForm";
import LabelList from "./components/LabelList";
import DueDateDialog from "./components/dialogs/DueDateDialog";
import NoteForm from "./components/NoteForm";
import NoteList from "./components/NoteList";
import WeekdayPicker from "./components/WeekdayPicker";
import TabPanel from "./components/ui/TabPanel";
import DateFilterPopover from "./components/dialogs/DateFilterPopover";
import LabelsActionsMenu from "./components/dialogs/LabelsActionsMenu";
import BulkLabelMenu from "./components/dialogs/BulkLabelMenu";
import ConfirmBulkDeleteDialog from "./components/dialogs/ConfirmBulkDeleteDialog";
import ConfirmDeleteLabelDialog from "./components/dialogs/ConfirmDeleteLabelDialog";
import ConfirmImportDialog from "./components/dialogs/ConfirmImportDialog";
import type { BeforeInstallPromptEvent, Category, Item } from "./types";
import dayjs, { type Dayjs } from "dayjs";
import {
  DEFAULT_FILE_NAME,
  getPersistedFileName,
  loadPersistedState,
  openPersistedStateFile,
  savePersistedState,
  serializeState,
} from "./utils/storage";
import {
  type AppNotificationResult,
  showAppNotification,
} from "./utils/notifications";
import {
  emptyItemFilters,
  matchesTextFilters,
  NO_CATEGORY_FILTER_VALUE,
  parseTextFilters,
} from "./utils/itemFilters";
import { dateRegex, formatDate, isToday } from "./utils/formatTimestamp";
import { getUniqueCreatedAt } from "./utils/itemTimestamps";
type TabValue = "items" | "categories";

const BULLET_PREFIX = "• ";
const CHECKBOX_PREFIX_PATTERN = /^\[ ?[xX]? ?\]\s?/;
const SHORT_MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const formatShortRangeDate = (value: Dayjs): string => {
  const day = value.date().toString().padStart(2, "0");
  const month = SHORT_MONTHS[value.month()] ?? value.format("MMM");
  const year = value.format("YY");
  return `${day} ${month} ${year}`;
};

const openGoogleCalendarWithText = (text: string, start: Dayjs) => {
  const end = start.add(1, "hour");
  const formatGoogleDate = (date: Dayjs) => date.format("YYYYMMDDTHHmmss");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text,
    dates: `${formatGoogleDate(start)}/${formatGoogleDate(end)}`,
    ctz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  window.open(
    `https://calendar.google.com/calendar/render?${params.toString()}`,
    "_blank",
    "noopener,noreferrer",
  );
};

function toggleBulletRows(text: string): string {
  const lines = text.split("\n").map((line) => {
    const trimmedStartLine = line.trimStart();
    const leadingWhitespace = line.slice(
      0,
      line.length - trimmedStartLine.length,
    );
    return `${leadingWhitespace}${trimmedStartLine.replace(CHECKBOX_PREFIX_PATTERN, "")}`;
  });
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  const hasNonEmptyLines = nonEmptyLines.length > 0;
  const allNonEmptyAreBulleted =
    hasNonEmptyLines &&
    nonEmptyLines.every((line) => line.trimStart().startsWith(BULLET_PREFIX));

  if (allNonEmptyAreBulleted) {
    return lines
      .map((line) => {
        const trimmedStartLine = line.trimStart();
        if (!trimmedStartLine.startsWith(BULLET_PREFIX)) {
          return line;
        }
        const leadingWhitespaceLength = line.length - trimmedStartLine.length;
        const leadingWhitespace = line.slice(0, leadingWhitespaceLength);
        return `${leadingWhitespace}${trimmedStartLine.slice(BULLET_PREFIX.length)}`;
      })
      .join("\n");
  }

  return lines
    .map((line) => {
      if (line.trim().length === 0) {
        return line;
      }
      const trimmedStartLine = line.trimStart();
      const leadingWhitespaceLength = line.length - trimmedStartLine.length;
      const leadingWhitespace = line.slice(0, leadingWhitespaceLength);
      return `${leadingWhitespace}${BULLET_PREFIX}${trimmedStartLine}`;
    })
    .join("\n");
}

function App() {
  const [activeTab, setActiveTab] = useState<TabValue>("items");
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [recentlyAddedItemId, setRecentlyAddedItemId] = useState<string | null>(
    null,
  );
  const [recentlyEditedItemId, setRecentlyEditedItemId] = useState<
    string | null
  >(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [notificationSeverity, setNotificationSeverity] = useState<
    "success" | "error" | "info" | "warning"
  >("success");
  const [itemFilters, setItemFilters] = useState(emptyItemFilters);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    new Set(),
  );
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [bulkCategoryAnchor, setBulkCategoryAnchor] =
    useState<HTMLElement | null>(null);
  const [labelsActionsAnchor, setLabelsActionsAnchor] =
    useState<HTMLElement | null>(null);
  const [confirmDeleteCategory, setConfirmDeleteCategory] =
    useState<Category | null>(null);
  const [latestCategoryId, setLatestCategoryId] = useState<string | null>(null);
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    categories: Category[];
    items: Item[];
    fileName: string;
    parseError: string | null;
  } | null>(null);
  const [storageFileName, setStorageFileName] =
    useState<string>(DEFAULT_FILE_NAME);
  const [storageReady, setStorageReady] = useState(true);
  const isInitializingRef = useRef(true);
  const [datePopoverAnchor, setDatePopoverAnchor] =
    useState<HTMLElement | null>(null);
  const [datePickerMode, setDatePickerMode] = useState<"start" | "end">(
    "start",
  );
  const [pendingDateFilter, setPendingDateFilter] = useState<{
    date: string;
    endDate: string;
    dueDate?: string;
    hasDue?: boolean;
  }>(emptyItemFilters);
  const [draftDueDate, setDraftDueDate] = useState<Dayjs | null>(null);
  const [draftNoteText, setDraftNoteText] = useState("");
  const [weekPickerDueDialogOpen, setWeekPickerDueDialogOpen] = useState(false);
  const [weekPickerDueDate, setWeekPickerDueDate] = useState<Dayjs | null>(
    null,
  );
  const [weekPickerDueHour12, setWeekPickerDueHour12] = useState<number>(12);
  const [weekPickerDueAmPm, setWeekPickerDueAmPm] = useState<"AM" | "PM">("AM");
  const [weekPickerDueMinute, setWeekPickerDueMinute] = useState<
    0 | 5 | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 45 | 50 | 55
  >(0);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [sharedText] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const text = params.get("text");
    const title = params.get("title");
    const url = params.get("url");
    const parts = [text, title, url].filter(Boolean);
    if (parts.length === 0) return null;
    const combined = parts.join("\n");
    window.history.replaceState({}, "", window.location.pathname);
    return combined;
  });

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data && (event.data as { type: string }).type === "COPY_TEXT") {
        const text = (event.data as { text: string }).text;
        void navigator.clipboard.writeText(text);
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () =>
      navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  const handleInstall = () => {
    if (!installPrompt) return;
    void installPrompt.prompt();
    installPrompt.userChoice.then(() => setInstallPrompt(null));
  };

  const handleNotificationResult = (result: AppNotificationResult) => {
    if (result === "permission-denied") {
      setNotificationSeverity("warning");
      setNotification(
        "Notifications are blocked. Enable them in your browser or iOS Home Screen app settings.",
      );
      return;
    }

    if (result === "unsupported") {
      setNotificationSeverity("warning");
      setNotification(
        "This device/browser does not support app notifications.",
      );
    }
  };

  useEffect(() => {
    let mounted = true;

    async function loadState() {
      const persistedFileName = await getPersistedFileName();
      if (!mounted) {
        return;
      }

      setStorageFileName(persistedFileName);
      const persistedState = await loadPersistedState();
      if (!mounted) {
        return;
      }

      setCategories(persistedState.categories);
      setItems(persistedState.items);
      setStorageFileName(persistedState.fileName);
      if (persistedState.parseError) {
        setNotificationSeverity("error");
        setNotification(persistedState.parseError);
      }
      setStorageReady(true);
      setActiveTab("items");
      isInitializingRef.current = false;
    }

    loadState();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!storageReady || isInitializingRef.current) {
      return;
    }

    savePersistedState({ categories, items }, storageFileName);
  }, [categories, items, storageReady, storageFileName]);

  useEffect(() => {
    if (!storageReady) {
      setActiveTab("categories");
    }
  }, [storageReady]);

  const selectImportFile = async () => {
    const result = await openPersistedStateFile(storageFileName);
    if (!result) return;
    if (result.parseError) {
      setNotificationSeverity("error");
      setNotification(result.parseError);
      return;
    }
    setPendingImport(result);
    setConfirmImportOpen(true);
  };

  const confirmImport = () => {
    if (!pendingImport) {
      setConfirmImportOpen(false);
      return;
    }
    setCategories(pendingImport.categories);
    setItems(pendingImport.items);
    setStorageFileName(pendingImport.fileName);
    setStorageReady(true);
    setActiveTab("items");
    setNotificationSeverity("success");
    setNotification(`Imported ${pendingImport.fileName}`);
    setPendingImport(null);
    setConfirmImportOpen(false);
  };

  const handleExportJson = () => {
    const payload = serializeState({ categories, items });
    // filename format: adnothed-state_YYYY-MM-DD_HH-MM.json
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate(),
    )}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
    const baseName = "adnothed-state";
    const downloadName = `${baseName}_${ts}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadName;
    link.click();
    setNotificationSeverity("success");
    setNotification(`Exported ${downloadName}`);
    URL.revokeObjectURL(url);
  };

  const handleSubmit: React.ComponentProps<typeof LabelForm>["onSubmit"] = (
    values,
  ) => {
    const iconName = values.icon.name;

    // ensure the icon is unique across categories
    const conflict = categories.some(
      (c) => c.id === iconName && c.id !== editingCategory?.id,
    );
    if (conflict) {
      setNotificationSeverity("error");
      setNotification("A label with that icon already exists.");
      return false;
    }

    if (editingCategory) {
      setCategories((prev) =>
        prev.map((prevCategory) => {
          if (prevCategory.id === editingCategory.id) {
            setItems((prev) =>
              prev.map((item) =>
                item.categoryId === prevCategory.id
                  ? { ...item, categoryId: iconName }
                  : item,
              ),
            );

            return {
              ...prevCategory,
              name: values.name,
              icon: values.icon,
              color: values.color,
              id: iconName,
            };
          }

          return prevCategory;
        }),
      );
      setNotificationSeverity("success");
      setNotification(`Updated label "${values.name}"`);
      setEditingCategory(null);
      return;
    }

    setCategories((prev) => [
      ...prev,
      {
        id: iconName,
        name: values.name,
        icon: values.icon,
        color: values.color,
      },
    ]);
    setLatestCategoryId(iconName);
    setNotificationSeverity("success");
    setNotification(`Added label "${values.name}"`);
  };

  const handleDelete = (category: Category) => {
    setCategories((prev) => prev.filter((c) => c.id !== category.id));
    setItems((prev) =>
      prev.map((item) =>
        item.categoryId === category.id ? { ...item, categoryId: null } : item,
      ),
    );
    if (editingCategory?.id === category.id) {
      setEditingCategory(null);
    }
    if (editingItem?.categoryId === category.id) {
      setEditingItem(null);
    }
  };

  const requestDeleteCategory = (category: Category) => {
    setConfirmDeleteCategory(category);
  };

  const parseDueTimeFromText = (
    text: string,
    selectedDay: Dayjs | null,
  ): {
    cleanedText: string;
    dueTimestamp?: number;
    openCalendar?: boolean;
  } => {
    const baseDate =
      selectedDay && selectedDay.isValid() ? selectedDay : today;
    const textWithToday = text.trim();
    let effectiveDate = baseDate;
    let workingText = textWithToday;

    const todayMatch = /(^|[\s(])today(?=$|[\s)\],;.!?])/i.exec(workingText);
    if (todayMatch) {
      effectiveDate = today;
      workingText = workingText
        .replace(todayMatch[0], todayMatch[1] ?? "")
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    const match = /(^|[\s(])((?:[01]?\d|2[0-3]):(?:0|5|10|15|20|25|30|35|40|45|50|55)|(?:[01]?\d|2[0-3])h(?:0|5|10|15|20|25|30|35|40|45|50|55)?)(g)?(?=$|[\s)\],;.!?])/i.exec(
      workingText,
    );

    if (!match) {
      return { cleanedText: textWithToday };
    }

    const rawToken = match[2].toLowerCase();
    const isHourSyntax = rawToken.includes("h");
    const hour = isHourSyntax
      ? Number.parseInt(rawToken.replace(/h.*$/, ""), 10)
      : Number.parseInt(rawToken.split(":")[0], 10);
    const minute = isHourSyntax
      ? Number.parseInt(rawToken.replace(/^[0-9]+h/, ""), 10) || 0
      : Number.parseInt(rawToken.split(":")[1], 10);

    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      return { cleanedText: textWithToday };
    }

    if (!isHourSyntax && ![0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].includes(minute)) {
      return { cleanedText: textWithToday };
    }

    if (
      isHourSyntax &&
      ![0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].includes(minute) &&
      rawToken !== `${hour}h`
    ) {
      return { cleanedText: textWithToday };
    }

    const nextDue = effectiveDate
      .clone()
      .hour(hour)
      .minute(minute)
      .second(0)
      .millisecond(0);

    const cleanedText = workingText
      .replace(match[0], match[1] ?? "")
      .replace(/\s{2,}/g, " ")
      .trim();

    return {
      cleanedText,
      dueTimestamp: nextDue.unix(),
      openCalendar: Boolean(match[3]),
    };
  };

  const handleItemSubmit: React.ComponentProps<typeof NoteForm>["onSubmit"] = (
    values,
  ) => {
    const categoryId = values.categoryId === "" ? null : values.categoryId;
    const categoryName =
      categories.find((c) => c.id === categoryId)?.name ?? "Reminder";
    const selectedDay =
      draftDueDate ??
      (itemFilters.weekday
        ? dayjs(itemFilters.weekday, "YYYY-MM-DD", true)
        : null);
    const hasExplicitSelectedDayTime =
      selectedDay !== null &&
      selectedDay.isValid() &&
      (selectedDay.hour() !== 0 ||
        selectedDay.minute() !== 0 ||
        selectedDay.second() !== 0);
    const hasFutureSelectedDay =
      selectedDay !== null &&
      selectedDay.isValid() &&
      selectedDay.isAfter(today, "day");
    const parsedSubmit = parseDueTimeFromText(values.text, selectedDay);
    const finalText = parsedSubmit.cleanedText.trim();
    const finalDueTimestamp =
      parsedSubmit.dueTimestamp ??
      (hasFutureSelectedDay || hasExplicitSelectedDayTime
        ? selectedDay?.unix()
        : undefined);

    if (finalText.length === 0) {
      return;
    }

    if (parsedSubmit.openCalendar && finalDueTimestamp !== undefined) {
      const eventText = finalText || categoryName;
      const start = dayjs.unix(finalDueTimestamp).second(0).millisecond(0);
      openGoogleCalendarWithText(eventText, start);
    }

    if (editingItem) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                categoryId,
                text: finalText,
                ...(finalDueTimestamp !== undefined ? { due: finalDueTimestamp } : {}),
              }
            : item,
        ),
      );
      setRecentlyAddedItemId(null);
      setRecentlyEditedItemId(editingItem.id);
      setDraftNoteText("");
      setDraftDueDate(null);
      setEditingItem(null);
      return;
    }

    setItems((prev) => {
      const createdAt = getUniqueCreatedAt(prev);
      const id = String(createdAt);

      setRecentlyAddedItemId(id);
      setRecentlyEditedItemId(null);

      return [
        ...prev,
        {
          id,
          categoryId,
          text: finalText,
          createdAt,
          hasNotification: true,
          ...(finalDueTimestamp !== undefined ? { due: finalDueTimestamp } : {}),
        },
      ];
    });
    setItemFilters(emptyItemFilters);
    setPendingDateFilter(emptyItemFilters);
    setDraftNoteText("");
    setDraftDueDate(null);
    setNotification(`${categoryName}: ${finalText}`);
    void showAppNotification(categoryName, finalText).then(
      handleNotificationResult,
    );
  };

  const handleItemCopy = (item: Item) => {
    navigator.clipboard.writeText(item.text);
    setNotificationSeverity("success");
    setNotification("Note Copied");
  };

  const handleItemShareLink = (item: Item) => {
    const url = `${window.location.origin}${window.location.pathname}?text=${encodeURIComponent(
      item.text,
    )}`;
    if (navigator.share) {
      void navigator.share({ url });
    } else {
      void navigator.clipboard.writeText(url);
      setNotificationSeverity("success");
      setNotification("Link Copied");
    }
  };

  const handleItemDelete = (item: Item) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    if (editingItem?.id === item.id) {
      setEditingItem(null);
    }
  };

  const handleItemToggleBullet = (item: Item) => {
    const nextText = toggleBulletRows(item.text);
    setItems((prev) =>
      prev.map((existingItem) =>
        existingItem.id === item.id
          ? { ...existingItem, text: nextText }
          : existingItem,
      ),
    );
    setRecentlyAddedItemId(null);
    setRecentlyEditedItemId(item.id);
    if (editingItem?.id === item.id) {
      setEditingItem({ ...editingItem, text: nextText });
    }
  };

  const handleItemAddCheckboxes = (item: Item) => {
    const rows = item.text.split("\n");
    const nonEmptyRows = rows.filter((row) => row.trim().length > 0);
    const allNonEmptyRowsAreCheckboxes =
      nonEmptyRows.length > 0 &&
      nonEmptyRows.every((row) =>
        CHECKBOX_PREFIX_PATTERN.test(row.trimStart()),
      );
    const nextText = rows
      .map((row) => {
        const trimmedStartRow = row.trimStart();
        const leadingWhitespace = row.slice(
          0,
          row.length - trimmedStartRow.length,
        );
        const rowWithoutBullet = trimmedStartRow.startsWith(BULLET_PREFIX)
          ? trimmedStartRow.slice(BULLET_PREFIX.length)
          : trimmedStartRow;
        if (!rowWithoutBullet.trim()) return row;
        if (allNonEmptyRowsAreCheckboxes) {
          return `${leadingWhitespace}${rowWithoutBullet.replace(CHECKBOX_PREFIX_PATTERN, "")}`;
        }
        if (/^\[ ?[xX]? ?\]/.test(rowWithoutBullet)) {
          return `${leadingWhitespace}${rowWithoutBullet}`;
        }
        return `${leadingWhitespace}[ ] ${rowWithoutBullet}`;
      })
      .join("\n");
    setItems((prev) =>
      prev.map((existingItem) =>
        existingItem.id === item.id
          ? { ...existingItem, text: nextText }
          : existingItem,
      ),
    );
    setRecentlyAddedItemId(null);
    setRecentlyEditedItemId(item.id);
    if (editingItem?.id === item.id) {
      setEditingItem({ ...editingItem, text: nextText });
    }
  };

  const handleItemToggleCheckbox = (item: Item, rowIndex: number) => {
    const nextText = item.text
      .split("\n")
      .map((row, index) => {
        if (index !== rowIndex) return row;
        return row.replace(/^\[ ?([xX])? ?\]/, (_match, checked) =>
          checked ? "[ ]" : "[x]",
        );
      })
      .join("\n");
    setItems((prev) =>
      prev.map((existingItem) =>
        existingItem.id === item.id
          ? { ...existingItem, text: nextText }
          : existingItem,
      ),
    );
    setRecentlyAddedItemId(null);
    setRecentlyEditedItemId(item.id);
    if (editingItem?.id === item.id) {
      setEditingItem({ ...editingItem, text: nextText });
    }
  };

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedItemIds(new Set());
  };

  const toggleItemSelected = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // if there are no notes, ensure select mode is disabled
  useEffect(() => {
    if (items.length === 0 && selectMode) {
      setSelectMode(false);
      setSelectedItemIds(new Set());
    }
  }, [items.length, selectMode]);

  const handleBulkDelete = () => {
    setItems((prev) => prev.filter((item) => !selectedItemIds.has(item.id)));
    setSelectedItemIds(new Set());
    setConfirmBulkDeleteOpen(false);
  };

  const handleBulkCategoryChange = (categoryId: string | null) => {
    setItems((prev) =>
      prev.map((item) =>
        selectedItemIds.has(item.id) ? { ...item, categoryId } : item,
      ),
    );
    setSelectedItemIds(new Set());
    setBulkCategoryAnchor(null);
  };

  const handleEditItem = (item: Item) => {
    setDatePopoverAnchor(null);
    setEditingItem(item);
  };

  const handleItemDueChange = (item: Item, due: number | null) => {
    setItems((prev) =>
      prev.map((existingItem) =>
        existingItem.id === item.id
          ? { ...existingItem, due: due ?? undefined }
          : existingItem,
      ),
    );
    setRecentlyAddedItemId(null);
    setRecentlyEditedItemId(item.id);
  };

  const handleItemPin = (item: Item) => {
    setItems((prev) =>
      prev.map((existingItem) =>
        existingItem.id === item.id
          ? { ...existingItem, pinned: !existingItem.pinned }
          : existingItem,
      ),
    );
    setRecentlyAddedItemId(null);
    setRecentlyEditedItemId(item.id);
  };

  const handleFilterTextChange = useCallback((value: string) => {
    setItemFilters((prev) =>
      prev.text === value
        ? prev
        : {
            ...prev,
            text: value,
          },
    );
  }, []);

  const handleFilterCategoryChange = useCallback((value: string) => {
    setItemFilters((prev) =>
      prev.categoryId === value
        ? prev
        : {
            ...prev,
            categoryId: value,
          },
    );
  }, []);

  const startDateValue = itemFilters.dueDate
    ? dayjs(itemFilters.dueDate)
    : itemFilters.date &&
        dateRegex.test(itemFilters.date) &&
        itemFilters.date.length === 10
      ? dayjs(itemFilters.date)
      : null;

  const endDateValue =
    itemFilters.endDate &&
    dateRegex.test(itemFilters.endDate) &&
    itemFilters.endDate.length === 10
      ? dayjs(itemFilters.endDate)
      : null;

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => b.createdAt - a.createdAt),
    [items],
  );

  const parsedTextFilters = useMemo(
    () => parseTextFilters(itemFilters.text),
    [itemFilters.text],
  );

  const calendarFilteredItems = useMemo(
    () =>
      sortedItems.filter((item, index) => {
        if (itemFilters.hasDue) {
          const todayUnix = dayjs().startOf("day").unix();
          if (item.due === undefined || item.due < todayUnix) {
            return false;
          }
        }

        if (itemFilters.categoryId === NO_CATEGORY_FILTER_VALUE) {
          if (item.categoryId !== null) {
            return false;
          }
        } else if (
          itemFilters.categoryId &&
          item.categoryId !== itemFilters.categoryId
        ) {
          return false;
        }

        return matchesTextFilters(
          item.text,
          item.createdAt,
          index,
          sortedItems.length,
          parsedTextFilters,
          item.due,
          item.categoryId,
        );
      }),
    [
      itemFilters.categoryId,
      itemFilters.hasDue,
      parsedTextFilters,
      sortedItems,
    ],
  );

  const filteredNoteCount = useMemo(
    () =>
      sortedItems.filter((item, index) => {
        if (itemFilters.categoryId === NO_CATEGORY_FILTER_VALUE) {
          if (item.categoryId !== null) {
            return false;
          }
        } else if (
          itemFilters.categoryId &&
          item.categoryId !== itemFilters.categoryId
        ) {
          return false;
        }

        if (
          !matchesTextFilters(
            item.text,
            item.createdAt,
            index,
            sortedItems.length,
            parsedTextFilters,
            item.due,
            item.categoryId,
          )
        ) {
          return false;
        }

        const itemDate = formatDate(item.createdAt);
        const hasStartDate =
          itemFilters.date.length === 10 && dateRegex.test(itemFilters.date);
        const hasEndDate =
          itemFilters.endDate.length === 10 &&
          dateRegex.test(itemFilters.endDate);

        if (hasStartDate && itemDate < itemFilters.date.trim()) {
          return false;
        }
        if (hasEndDate && itemDate > itemFilters.endDate.trim()) {
          return false;
        }
        if (itemFilters.dueDate) {
          if (!item.due || formatDate(item.due) !== itemFilters.dueDate) {
            return false;
          }
        }
        if (itemFilters.weekday !== null) {
          const itemCreatedDate = formatDate(item.createdAt);
          const itemDueDate =
            item.due !== undefined ? formatDate(item.due) : null;
          if (
            itemCreatedDate !== itemFilters.weekday &&
            itemDueDate !== itemFilters.weekday
          ) {
            return false;
          }
        }
        if (itemFilters.hasDue) {
          const todayUnix = dayjs().startOf("day").unix();
          if (item.due === undefined || item.due < todayUnix) {
            return false;
          }
        }

        return true;
      }).length,
    [
      itemFilters.categoryId,
      itemFilters.date,
      itemFilters.dueDate,
      itemFilters.endDate,
      itemFilters.hasDue,
      itemFilters.weekday,
      itemFilters.text,
      parsedTextFilters,
      sortedItems,
    ],
  );

  const noteCountsByDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of calendarFilteredItems) {
      const dayKey = formatDate(item.createdAt);
      counts.set(dayKey, (counts.get(dayKey) ?? 0) + 1);
    }
    return counts;
  }, [calendarFilteredItems]);

  const oldestNoteDate = useMemo(() => {
    if (items.length === 0) {
      return dayjs().startOf("day");
    }
    const minTimestamp = Math.min(...items.map((item) => item.createdAt));
    return dayjs.unix(minTimestamp).startOf("day");
  }, [items]);

  const today = useMemo(() => dayjs().startOf("day"), []);

  const filteredMinDate = useMemo(() => {
    if (calendarFilteredItems.length === 0) {
      return oldestNoteDate;
    }
    const minTimestamp = Math.min(
      ...calendarFilteredItems.map((item) => item.createdAt),
    );
    return dayjs.unix(minTimestamp).startOf("day");
  }, [calendarFilteredItems, oldestNoteDate]);

  const dueFutureCount = useMemo(() => {
    const todayUnix = today.unix();
    return items.filter(
      (item) => item.due !== undefined && item.due >= todayUnix,
    ).length;
  }, [items, today]);

  const weekdayStripDays = useMemo(
    () =>
      Array.from({ length: 31 }, (_unused, idx) => {
        const offset = idx - 0;
        return today.add(offset, "day");
      }),
    [today],
  );

  const noteCountByDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const key = dayjs.unix(item.createdAt).format("YYYY-MM-DD");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const dueCountByDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (item.due === undefined) {
        continue;
      }
      const dueDay = dayjs.unix(item.due).startOf("day");
      if (dueDay.isBefore(today, "day")) {
        continue;
      }
      const key = dueDay.format("YYYY-MM-DD");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [items, today]);

  const weekPickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = weekPickerRef.current;
    if (!container) {
      return;
    }

    container.scrollLeft = 0;
  }, [today]);

  const handleWeekdayToggle = (dayKey: string) => {
    setDatePopoverAnchor(null);
    setDraftDueDate(null);
    setPendingDateFilter((prev) => ({
      ...prev,
      date: "",
      endDate: "",
    }));
    setItemFilters((prev) => ({
      ...prev,
      weekday: prev.weekday === dayKey ? null : dayKey,
      date: "",
      endDate: "",
      dueDate: "",
      hasDue: false,
    }));
  };

  const noteTextForGoogleCalendar = editingItem?.text ?? draftNoteText;

  const handleWeekPickerSaveDueDate = () => {
    const nextSelectedDay = weekPickerDueDate ?? today;
    if (nextSelectedDay.isBefore(today, "day")) {
      setWeekPickerDueDate(today);
      return;
    }
    setWeekPickerDueDate(nextSelectedDay.startOf("day"));
    const h24 =
      weekPickerDueAmPm === "AM"
        ? weekPickerDueHour12 === 12
          ? 0
          : weekPickerDueHour12
        : weekPickerDueHour12 === 12
          ? 12
          : weekPickerDueHour12 + 12;
    const nextDueDate = nextSelectedDay
      .hour(h24)
      .minute(weekPickerDueMinute)
      .second(0);
    setDraftDueDate(nextDueDate);
    setItemFilters((prev) => ({
      ...prev,
      weekday: nextDueDate.format("YYYY-MM-DD"),
      date: "",
      endDate: "",
      dueDate: "",
      hasDue: false,
    }));
    setWeekPickerDueDialogOpen(false);
  };

  const handleWeekPickerAddToGoogleCalendar = () => {
    const eventText = noteTextForGoogleCalendar.trim();
    if (!weekPickerDueDate || !eventText) return;
    const h24 =
      weekPickerDueAmPm === "AM"
        ? weekPickerDueHour12 === 12
          ? 0
          : weekPickerDueHour12
        : weekPickerDueHour12 === 12
          ? 12
          : weekPickerDueHour12 + 12;
    const start = weekPickerDueDate
      .hour(h24)
      .minute(weekPickerDueMinute)
      .second(0)
      .millisecond(0);
    openGoogleCalendarWithText(eventText, start);
  };

  const handleWeekPickerClearDueDate = () => {
    setDraftDueDate(null);
    setItemFilters((prev) => ({
      ...prev,
      weekday: null,
      date: "",
      endDate: "",
      dueDate: "",
      hasDue: false,
    }));
    setWeekPickerDueDialogOpen(false);
  };

  const isDatePopoverOpen = Boolean(datePopoverAnchor);
  const activeStartDate =
    pendingDateFilter.date &&
    dateRegex.test(pendingDateFilter.date) &&
    pendingDateFilter.date.length === 10
      ? dayjs(pendingDateFilter.date)
      : startDateValue;
  const activeEndDate =
    pendingDateFilter.endDate &&
    dateRegex.test(pendingDateFilter.endDate) &&
    pendingDateFilter.endDate.length === 10
      ? dayjs(pendingDateFilter.endDate)
      : endDateValue;
  const startRangeLabel = activeStartDate
    ? formatShortRangeDate(activeStartDate)
    : "?";
  const endRangeLabel = activeEndDate
    ? formatShortRangeDate(activeEndDate)
    : "?";
  const showRangeInTitle = Boolean(activeStartDate || activeEndDate);
  const titleRangeSuffix = showRangeInTitle
    ? `${startRangeLabel} - ${endRangeLabel}`
    : "";

  const applyDateFilter = (nextFilter: {
    date: string;
    endDate: string;
    dueDate?: string;
    hasDue?: boolean;
  }) => {
    setPendingDateFilter(nextFilter);
    setItemFilters((prev) => ({
      ...prev,
      date: nextFilter.date,
      endDate: nextFilter.endDate,
      dueDate: "",
      hasDue: false,
    }));
  };

  const futureDueLabel = useMemo(() => {
    const selectedDay =
      draftDueDate ??
      (itemFilters.weekday
        ? dayjs(itemFilters.weekday, "YYYY-MM-DD", true)
        : null);
    const parsedDue =
      draftNoteText !== ""
        ? parseDueTimeFromText(draftNoteText, selectedDay ?? today)
        : null;
    const activeDay =
      parsedDue?.dueTimestamp !== undefined
        ? dayjs.unix(parsedDue.dueTimestamp)
        : selectedDay && selectedDay.isValid()
          ? selectedDay
          : null;

    if (!activeDay || !activeDay.isValid()) {
      return undefined;
    }

    const hasExplicitTime =
      parsedDue?.dueTimestamp !== undefined ||
      activeDay.hour() !== 0 ||
      activeDay.minute() !== 0 ||
      activeDay.second() !== 0;

    if (parsedDue?.dueTimestamp !== undefined) {
      const dayLabel = activeDay.isSame(today, "day")
        ? "Today"
        : activeDay.format("ddd, MMM D");
      const label = `${dayLabel} at ${activeDay.format("HH:mm")}`;
      return parsedDue.openCalendar ? `${label} g` : label;
    }

    if (selectedDay && selectedDay.isValid()) {
      const isTodaySelected = selectedDay.isSame(today, "day");
      if (isTodaySelected && hasExplicitTime) {
        return `Today at ${selectedDay.format("HH:mm")}`;
      }

      if (selectedDay.isAfter(today, "day")) {
        return hasExplicitTime
          ? `${selectedDay.format("ddd, MMM D")} at ${selectedDay.format("HH:mm")}`
          : selectedDay.format("ddd, MMM D");
      }
    }

    return undefined;
  }, [draftDueDate, draftNoteText, itemFilters.weekday, today]);

  const openWeekPickerDueDialog = () => {
    const initialDate =
      draftDueDate ??
      (itemFilters.weekday
        ? dayjs(itemFilters.weekday, "YYYY-MM-DD", true)
        : today);
    const baseDate = initialDate.isValid()
      ? initialDate.isBefore(today, "day")
        ? today
        : initialDate
      : today;
    setWeekPickerDueDate(baseDate.startOf("day"));
    setWeekPickerDueHour12(
      baseDate.hour() > 12
        ? baseDate.hour() - 12
        : baseDate.hour() === 0
          ? 12
          : baseDate.hour(),
    );
    setWeekPickerDueAmPm(baseDate.hour() >= 12 ? "PM" : "AM");
    setWeekPickerDueMinute(
      ([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as const).reduce(
        (prev, curr) =>
          Math.abs(curr - baseDate.minute()) < Math.abs(prev - baseDate.minute())
            ? curr
            : prev,
      ),
    );
    setWeekPickerDueDialogOpen(true);
  };

  return (
    <main>
      <Box>
        <Paper sx={{ p: 1 }}>
          <Stack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Tabs
              value={activeTab}
              sx={{
                minHeight: 36,
                "& .MuiTab-root": {
                  minWidth: 0,
                  px: 1.5,
                  py: 0,
                  minHeight: 40,
                },
              }}
              onChange={(_event, newValue) => {
                const normalized =
                  newValue === "items" || newValue === "categories"
                    ? newValue
                    : (String(newValue) as TabValue);
                if (normalized === "categories") {
                  setItemFilters(emptyItemFilters);
                  setSelectMode(false);
                }
                setActiveTab(normalized);
              }}
            >
              <Tab
                value="items"
                label={
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
                  >
                    <Box
                      component="span"
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        lineHeight: 1,
                      }}
                    >
                      <Icon path={mdiNoteText} size={0.75} />
                      <Box
                        component="span"
                        sx={{
                          fontSize: "0.5rem",
                          opacity: 0.8,
                          mt: 0.15,
                        }}
                      >
                        {filteredNoteCount}
                      </Box>
                    </Box>
                    <Box component="span">Notes</Box>
                  </Box>
                }
                id="tab-items"
                aria-controls="tabpanel-items"
              />
              <Tab
                value="categories"
                label={
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
                  >
                    <Box
                      component="span"
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        lineHeight: 1,
                      }}
                    >
                      <Icon path={mdiLabelMultiple} size={0.75} />
                      <Box
                        component="span"
                        sx={{
                          fontSize: "0.5rem",
                          opacity: 0.8,
                          mt: 0.15,
                        }}
                      >
                        {categories.length}
                      </Box>
                    </Box>
                    <Box component="span">Labels</Box>
                  </Box>
                }
                id="tab-categories"
                aria-controls="tabpanel-categories"
              />
            </Tabs>
            {activeTab === "items" && (
              <Stack direction="row" sx={{ alignItems: "center" }}>
                <Tooltip
                  title={
                    selectMode ? "Cancel select mode" : "Select multiple notes"
                  }
                >
                  <IconButton
                    aria-label="Toggle select mode"
                    color={selectMode ? "primary" : "default"}
                    onClick={toggleSelectMode}
                    disabled={items.length === 0}
                  >
                    <Badge
                      badgeContent={selectedItemIds.size}
                      color="primary"
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      sx={{
                        "& .MuiBadge-badge": {
                          backgroundColor: "primary",
                          color: colors.grey[900],
                          minWidth: 12,
                          height: 12,
                          fontSize: "0.5rem",
                        },
                      }}
                    >
                      <Icon path={mdiCheckboxMultipleMarked} size={0.9} />
                    </Badge>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Filter by date">
                  <IconButton
                    aria-label="Filter by date"
                    color={
                      isDatePopoverOpen ||
                      itemFilters.date ||
                      itemFilters.endDate ||
                      itemFilters.dueDate ||
                      itemFilters.hasDue
                        ? "primary"
                        : "default"
                    }
                    onClick={(event) => {
                      if (isDatePopoverOpen) {
                        setDatePopoverAnchor(null);
                        return;
                      }
                      setPendingDateFilter({
                        date: itemFilters.date,
                        endDate: itemFilters.endDate,
                      });
                      setDatePickerMode("start");
                      setDatePopoverAnchor(event.currentTarget);
                    }}
                    disabled={items.length === 0 || selectMode}
                  >
                    <Icon path={mdiCalendar} size={0.9} />
                  </IconButton>
                </Tooltip>
                <DateFilterPopover
                  open={isDatePopoverOpen}
                  anchorEl={datePopoverAnchor}
                  onClose={() => setDatePopoverAnchor(null)}
                  datePickerMode={datePickerMode}
                  titleRangeSuffix={titleRangeSuffix}
                  activeStartDate={activeStartDate}
                  activeEndDate={activeEndDate}
                  pendingDateFilter={pendingDateFilter}
                  setPendingDateFilter={setPendingDateFilter}
                  applyDateFilter={applyDateFilter}
                  filteredMinDate={filteredMinDate}
                  noteCountsByDay={noteCountsByDay}
                  today={today}
                  setDatePickerMode={setDatePickerMode}
                />
              </Stack>
            )}
            {activeTab === "categories" && (
              <>
                <Tooltip title="Import/Export">
                  <IconButton
                    aria-label="Import/Export"
                    aria-controls={
                      labelsActionsAnchor ? "labels-actions-menu" : undefined
                    }
                    aria-haspopup="true"
                    aria-expanded={labelsActionsAnchor ? "true" : undefined}
                    onClick={(event) =>
                      setLabelsActionsAnchor(event.currentTarget)
                    }
                  >
                    <Icon path={mdiFileImport} size={0.9} />
                  </IconButton>
                </Tooltip>
                <LabelsActionsMenu
                  anchorEl={labelsActionsAnchor}
                  onClose={() => setLabelsActionsAnchor(null)}
                  onImport={() => {
                    void selectImportFile();
                  }}
                  onExport={() => {
                    handleExportJson();
                  }}
                />
              </>
            )}
          </Stack>
          <Box sx={{ pt: 2 }}>
            <TabPanel value={activeTab} index="items">
              <Stack spacing={1}>
                <NoteForm
                  editingItem={editingItem}
                  initialText={sharedText ?? undefined}
                  categories={categories}
                  dueLabel={futureDueLabel}
                  dueFutureCount={dueFutureCount}
                  onDueDateClick={openWeekPickerDueDialog}
                  onSubmit={handleItemSubmit}
                  onCancelEdit={() => setEditingItem(null)}
                  onFilterTextChange={handleFilterTextChange}
                  onFilterCategoryChange={handleFilterCategoryChange}
                  onNoteTextChange={setDraftNoteText}
                />
                <Box
                  sx={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                  }}
                >
                  <Box
                    ref={weekPickerRef}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      overflowX: "auto",
                      overflowY: "visible",
                      py: 1,
                      scrollbarWidth: "none",
                      "&::-webkit-scrollbar": {
                        display: "none",
                      },
                      "&::-webkit-scrollbar-thumb": {
                        display: "none",
                      },
                      "-ms-overflow-style": "none",
                    }}
                  >
                    <WeekdayPicker
                      days={weekdayStripDays}
                      today={today}
                      selectedDayKey={
                        draftDueDate
                          ? draftDueDate.format("YYYY-MM-DD")
                          : itemFilters.weekday
                      }
                      noteCountByDay={noteCountByDay}
                      dueCountByDay={dueCountByDay}
                      onSelect={handleWeekdayToggle}
                    />
                  </Box>
                </Box>
                {selectMode && (
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <Tooltip
                      title={
                        selectedItemIds.size > 0
                          ? "Change label"
                          : "Select notes to enable"
                      }
                    >
                      <span>
                        <Button
                          variant="text"
                          startIcon={<Icon path={mdiFolderMove} size={0.9} />}
                          disabled={selectedItemIds.size === 0}
                          onClick={(event) =>
                            setBulkCategoryAnchor(event.currentTarget)
                          }
                          sx={{ textTransform: "none" }}
                        >
                          Label
                        </Button>
                      </span>
                    </Tooltip>
                    <Tooltip
                      title={
                        selectedItemIds.size > 0
                          ? "Delete selected"
                          : "Select notes to enable"
                      }
                    >
                      <span>
                        <Button
                          variant="text"
                          startIcon={
                            <Icon path={mdiTrashCanOutline} size={0.9} />
                          }
                          disabled={selectedItemIds.size === 0}
                          onClick={() => setConfirmBulkDeleteOpen(true)}
                          sx={{ textTransform: "none" }}
                        >
                          Delete
                        </Button>
                      </span>
                    </Tooltip>
                    <Tooltip title="Exit select mode">
                      <span>
                        <Button
                          variant="text"
                          startIcon={<Icon path={mdiCancel} size={0.9} />}
                          onClick={() => {
                            setSelectedItemIds(new Set());
                            setSelectMode(false);
                          }}
                          sx={{ textTransform: "none" }}
                        >
                          Cancel
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                )}
                <NoteList
                  items={items}
                  categories={categories}
                  filters={itemFilters}
                  mostRecentAddedItemId={recentlyAddedItemId}
                  mostRecentEditedItemId={recentlyEditedItemId}
                  dueDaysByDate={dueCountByDay}
                  noteCountsByDay={noteCountByDay}
                  onEdit={handleEditItem}
                  onDelete={handleItemDelete}
                  onCopy={handleItemCopy}
                  onShareLink={handleItemShareLink}
                  onToggleBullet={handleItemToggleBullet}
                  onAddCheckboxes={handleItemAddCheckboxes}
                  onToggleCheckbox={handleItemToggleCheckbox}
                  onDueChange={handleItemDueChange}
                  onPin={handleItemPin}
                  onNotify={(item) => {
                    const categoryName =
                      categories.find((c) => c.id === item.categoryId)?.name ??
                      "Reminder";
                    const now = Math.floor(Date.now() / 1000);
                    // mark item as having an active notification
                    setItems((prev) =>
                      prev.map((existingItem) =>
                        existingItem.id === item.id
                          ? (() => {
                              const shouldRefreshTimestamp = isToday(
                                existingItem.createdAt,
                              );
                              const nextCreatedAt = shouldRefreshTimestamp
                                ? getUniqueCreatedAt(prev, now, existingItem.id)
                                : existingItem.createdAt;

                              return {
                                ...existingItem,
                                hasNotification: true,
                                id: String(nextCreatedAt),
                                createdAt: nextCreatedAt,
                              };
                            })()
                          : existingItem,
                      ),
                    );
                    setNotification(`${categoryName}: ${item.text}`);
                    void showAppNotification(categoryName, item.text).then(
                      handleNotificationResult,
                    );
                  }}
                  onCategoryChange={(item, categoryId) => {
                    setItems((prev) =>
                      prev.map((existingItem) =>
                        existingItem.id === item.id
                          ? { ...existingItem, categoryId }
                          : existingItem,
                      ),
                    );
                    if (editingItem?.id === item.id) {
                      setEditingItem({ ...editingItem, categoryId });
                    }
                  }}
                  selectMode={selectMode}
                  selectedIds={selectedItemIds}
                  onToggleSelect={toggleItemSelected}
                  onInstall={installPrompt ? handleInstall : undefined}
                />
              </Stack>
            </TabPanel>
            <TabPanel value={activeTab} index="categories">
              <Stack spacing={2}>
                <LabelForm
                  editingCategory={editingCategory}
                  onSubmit={handleSubmit}
                  onCancelEdit={() => setEditingCategory(null)}
                />
                <LabelList
                  categories={categories}
                  onEdit={setEditingCategory}
                  onDelete={requestDeleteCategory}
                  newCategoryId={latestCategoryId}
                />
              </Stack>
            </TabPanel>
          </Box>
        </Paper>
        {weekPickerDueDialogOpen && (
          <DueDateDialog
            open
            onClose={() => setWeekPickerDueDialogOpen(false)}
            value={weekPickerDueDate}
            onChange={(value) => {
              if (!value) return;
              const nextValue = value.startOf("day");
              if (nextValue.isBefore(today, "day")) {
                setWeekPickerDueDate(today);
                return;
              }
              setWeekPickerDueDate(nextValue);
            }}
            minDate={today}
            hour12={weekPickerDueHour12}
            amPm={weekPickerDueAmPm}
            minute={weekPickerDueMinute}
            onHourChange={setWeekPickerDueHour12}
            onAmPmChange={setWeekPickerDueAmPm}
            onMinuteChange={setWeekPickerDueMinute}
            onSave={handleWeekPickerSaveDueDate}
            onGoogleCalendar={handleWeekPickerAddToGoogleCalendar}
            googleCalendarDisabled={
              !weekPickerDueDate || !noteTextForGoogleCalendar.trim()
            }
            onRemove={handleWeekPickerClearDueDate}
            showRemoveButton={Boolean(draftDueDate || itemFilters.weekday)}
            dueDaysByDate={dueCountByDay}
            noteCountsByDay={noteCountByDay}
            title="Set due date"
          />
        )}
        <Snackbar
          open={!!notification}
          autoHideDuration={3000}
          onClose={() => setNotification(null)}
        >
          <Alert
            onClose={() => setNotification(null)}
            severity={notificationSeverity}
            sx={{ width: "100%" }}
          >
            {notification}
          </Alert>
        </Snackbar>
        <ConfirmBulkDeleteDialog
          open={confirmBulkDeleteOpen}
          selectedCount={selectedItemIds.size}
          onClose={() => setConfirmBulkDeleteOpen(false)}
          onConfirm={handleBulkDelete}
        />
        <ConfirmDeleteLabelDialog
          open={!!confirmDeleteCategory}
          categoryName={confirmDeleteCategory?.name ?? null}
          onClose={() => setConfirmDeleteCategory(null)}
          onConfirm={() => {
            if (confirmDeleteCategory) {
              handleDelete(confirmDeleteCategory);
              setNotificationSeverity("success");
              setNotification(`Deleted label "${confirmDeleteCategory.name}"`);
            }
            setConfirmDeleteCategory(null);
          }}
        />
        <ConfirmImportDialog
          open={confirmImportOpen}
          pendingImport={pendingImport}
          onClose={() => {
            setConfirmImportOpen(false);
            setPendingImport(null);
          }}
          onConfirm={confirmImport}
        />
        <BulkLabelMenu
          anchorEl={bulkCategoryAnchor}
          categories={categories}
          onClose={() => setBulkCategoryAnchor(null)}
          onSelect={(categoryId) => {
            handleBulkCategoryChange(categoryId);
          }}
        />
      </Box>
    </main>
  );
}

export default App;
