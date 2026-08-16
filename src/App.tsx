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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Popover,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import { Icon } from "@mdi/react";
import {
  mdiCancel,
  mdiClose,
  mdiCheckboxMultipleMarked,
  mdiFolderMove,
  mdiTrashCanOutline,
  mdiUpload,
  mdiDownload,
  mdiCalendar,
  mdiCheckCircle,
  mdiCalendarClock,
  mdiNoteText,
  mdiLabelMultiple,
  mdiFileImport,
} from "@mdi/js";
import CategoryForm from "./components/CategoryForm";
import CategoryList from "./components/CategoryList";
import DueDateDialog from "./components/DueDateDialog";
import ItemForm from "./components/ItemForm";
import ItemList from "./components/ItemList";
import TabPanel from "./components/TabPanel";
import LabelIcon from "./components/LabelIcon";
import type { BeforeInstallPromptEvent, Category, Item } from "./types";
import dayjs, { type Dayjs } from "dayjs";
import { DateCalendar } from "@mui/x-date-pickers";
import { PickerDay, type PickerDayProps } from "@mui/x-date-pickers/PickerDay";
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

const WEEKDAY_LETTERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const formatShortRangeDate = (value: Dayjs): string => {
  const day = value.date().toString().padStart(2, "0");
  const month = SHORT_MONTHS[value.month()] ?? value.format("MMM");
  const year = value.format("YY");
  return `${day} ${month} ${year}`;
};

type NoteDayProps = PickerDayProps & {
  noteCountsByDay: Map<string, number>;
  dueDaysByDate: Map<string, number>;
  startDate: Dayjs | null;
  endDate: Dayjs | null;
};

const NoteDay = ({
  day,
  noteCountsByDay,
  dueDaysByDate,
  startDate,
  endDate,
  outsideCurrentMonth,
  disabled,
  ...other
}: NoteDayProps) => {
  const key = dayjs(day).format("YYYY-MM-DD");
  const noteCount = noteCountsByDay.get(key) ?? 0;
  const hasNotes = noteCount > 0;
  const dueCount = dueDaysByDate.get(key) ?? 0;
  const hasDue = dueCount > 0;
  const isOutside = Boolean(outsideCurrentMonth);
  const isDisabled = Boolean(disabled);
  const isRangeBoundary =
    startDate?.isSame(day, "day") || endDate?.isSame(day, "day");
  const showBadge = !isDisabled && (noteCount > 0 || dueCount > 0);

  return (
    <Badge
      overlap="circular"
      badgeContent={showBadge ? noteCount || dueCount : 0}
      color={noteCount ? "success" : hasDue ? "warning" : "default"}
      sx={{
        "& .MuiBadge-badge": {
          minWidth: 14,
          height: 14,
          fontSize: "0.6rem",
          lineHeight: 1,
          p: 0,
          top: 6,
          right: 5,
        },
      }}
    >
      <PickerDay
        day={day}
        outsideCurrentMonth={outsideCurrentMonth}
        disabled={isDisabled}
        {...other}
        sx={{
          color: isDisabled
            ? colors.blueGrey[500]
            : isOutside
              ? colors.blueGrey[500]
              : colors.blueGrey[100],
          opacity: isDisabled ? 0.5 : isOutside ? 0.6 : 1,
          backgroundColor: isDisabled
            ? "transparent"
            : isRangeBoundary
              ? "rgba(33, 150, 243, 0.12)"
              : hasNotes
                ? "rgba(76, 175, 80, 0.2)"
                : hasDue
                  ? "rgba(255, 152, 0, 0.2)"
                  : "transparent",
          border: isDisabled
            ? "1px solid transparent"
            : hasNotes
              ? `1px solid ${isOutside ? colors.blueGrey[600] : colors.blueGrey[400]}`
              : hasDue
                ? `2px solid ${colors.orange[400]}`
                : isRangeBoundary
                  ? `1px solid ${colors.blue[600]}`
                  : "1px solid transparent",
          "&:hover, &:focus": {
            backgroundColor: isDisabled
              ? "transparent"
              : isOutside
                ? "rgba(96, 125, 139, 0.18)"
                : "rgba(96, 125, 139, 0.28)",
            textTransform: isDisabled ? "none" : "lowercase",
          },
          "&.Mui-selected:hover, &.Mui-selected:focus": {
            backgroundColor: colors.lightBlue[600],
          },
          ...(hasNotes && !isDisabled
            ? {
                textTransform: "lowercase",
                backgroundColor: isOutside
                  ? "rgba(76, 175, 80, 0.12)"
                  : "rgba(76, 175, 80, 0.2)",
                color: colors.blueGrey[200],
                border: `1px solid ${isOutside ? colors.blueGrey[600] : colors.blueGrey[400]}`,
                "&:hover, &:focus": {
                  backgroundColor: isOutside
                    ? "rgba(76, 175, 80, 0.2)"
                    : "rgba(76, 175, 80, 0.32)",
                },
              }
            : {}),
          ...(hasDue && !hasNotes && !isDisabled
            ? {
                border: `2px solid ${colors.orange[400]}`,
                color: colors.orange[200],
                backgroundColor: isOutside
                  ? "rgba(255, 152, 0, 0.12)"
                  : "rgba(255, 152, 0, 0.2)",
              }
            : {}),
          ...(isRangeBoundary && !isDisabled
            ? {
                backgroundColor: "rgba(33, 150, 243, 0.12)",
                color: colors.common.white,
                border: `1px solid ${colors.blue[600]}`,
                opacity: 1,
                "&:hover, &:focus": {
                  backgroundColor: "rgba(33, 150, 243, 0.2)",
                },
              }
            : {}),
        }}
      />
    </Badge>
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
    0 | 15 | 30 | 45
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

  const handleSubmit: React.ComponentProps<typeof CategoryForm>["onSubmit"] = (
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

  const handleItemSubmit: React.ComponentProps<typeof ItemForm>["onSubmit"] = (
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
    const hasFutureSelectedDay =
      selectedDay !== null &&
      selectedDay.isValid() &&
      selectedDay.isAfter(today, "day");

    if (editingItem) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                categoryId,
                text: values.text,
                ...(hasFutureSelectedDay ? { due: selectedDay.unix() } : {}),
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
          text: values.text,
          createdAt,
          hasNotification: true,
          ...(hasFutureSelectedDay ? { due: selectedDay.unix() } : {}),
        },
      ];
    });
    setItemFilters(emptyItemFilters);
    setPendingDateFilter(emptyItemFilters);
    setDraftNoteText("");
    setDraftDueDate(null);
    setNotification(`${categoryName}: ${values.text}`);
    void showAppNotification(categoryName, values.text).then(
      handleNotificationResult,
    );
  };

  useEffect(() => {
    if (!recentlyAddedItemId) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setRecentlyAddedItemId(null);
    }, 6000);

    return () => window.clearTimeout(timeoutId);
  }, [recentlyAddedItemId]);

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
        );
      }),
    [
      itemFilters.categoryId,
      itemFilters.hasDue,
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
      Array.from({ length: 8 }, (_unused, idx) => {
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
    if (!weekPickerDueDate) return;
    if (weekPickerDueDate.isBefore(today, "day")) {
      setWeekPickerDueDate(today);
      return;
    }
    const h24 =
      weekPickerDueAmPm === "AM"
        ? weekPickerDueHour12 === 12
          ? 0
          : weekPickerDueHour12
        : weekPickerDueHour12 === 12
          ? 12
          : weekPickerDueHour12 + 12;
    const nextDueDate = weekPickerDueDate
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
      .second(0);
    const end = start.add(1, "hour");
    const formatGoogleDate = (date: Dayjs) => date.format("YYYYMMDDTHHmmss");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: eventText,
      dates: `${formatGoogleDate(start)}/${formatGoogleDate(end)}`,
      ctz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    window.open(
      `https://calendar.google.com/calendar/render?${params.toString()}`,
      "_blank",
      "noopener,noreferrer",
    );
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
    if (
      !selectedDay ||
      !selectedDay.isValid() ||
      !selectedDay.isAfter(today, "day")
    ) {
      return undefined;
    }
    const hasTime =
      selectedDay.hour() !== 0 ||
      selectedDay.minute() !== 0 ||
      selectedDay.second() !== 0;
    return hasTime
      ? selectedDay.format("ddd, MMM D, HH:mm")
      : selectedDay.format("ddd, MMM D");
  }, [draftDueDate, itemFilters.weekday, today]);

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
                label="Notes"
                icon={<Icon path={mdiNoteText} size={0.75} />}
                iconPosition="start"
                id="tab-items"
                aria-controls="tabpanel-items"
              />
              <Tab
                value="categories"
                label="Labels"
                icon={<Icon path={mdiLabelMultiple} size={0.75} />}
                iconPosition="start"
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
                          backgroundColor: colors.orange[400],
                          color: colors.grey[900],
                          minWidth: 14,
                          height: 14,
                          fontSize: "0.6rem",
                          lineHeight: 1,
                          p: 0,
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
                <Popover
                  open={isDatePopoverOpen}
                  anchorEl={datePopoverAnchor}
                  onClose={() => setDatePopoverAnchor(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  slotProps={{
                    paper: {
                      sx: {
                        backgroundColor: colors.blueGrey[900],
                        border: `1px solid ${colors.blueGrey[700]}`,
                        p: 0,
                        minWidth: 320,
                        overflow: "hidden",
                      },
                    },
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      backgroundColor: colors.blueGrey[800],
                      borderBottom: `1px solid ${colors.blueGrey[700]}`,
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: colors.blueGrey[100],
                        px: 1.25,
                        py: 1,
                        textAlign: "center",
                      }}
                    >
                      {datePickerMode === "start" ? "Start Date" : "End Date"}
                    </Typography>
                    <Tooltip title="Close">
                      <IconButton
                        aria-label="Close"
                        size="small"
                        onClick={() => setDatePopoverAnchor(null)}
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
                  </Box>
                  <Box sx={{ px: 1, py: 0.75 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: colors.blueGrey[100],
                        textAlign: "center",
                        fontSize: "0.8rem",
                        p: 0,
                        m: 0,
                      }}
                    >
                      {titleRangeSuffix}
                    </Typography>
                    <DateCalendar
                      value={
                        datePickerMode === "start"
                          ? activeStartDate
                          : activeEndDate
                      }
                      onChange={(value: Dayjs | null) => {
                        if (!value) return;
                        const next = value.format("YYYY-MM-DD");
                        if (datePickerMode === "start") {
                          const nextFilter = {
                            ...pendingDateFilter,
                            date: next,
                            endDate: next,
                          };
                          setPendingDateFilter(nextFilter);
                          return;
                        }
                        const nextFilter = {
                          ...pendingDateFilter,
                          endDate: next,
                        };
                        setPendingDateFilter(nextFilter);
                      }}
                      showDaysOutsideCurrentMonth
                      minDate={
                        datePickerMode === "start"
                          ? filteredMinDate
                          : (activeStartDate ?? filteredMinDate)
                      }
                      maxDate={today}
                      shouldDisableDate={(day) => day.isAfter(today, "day")}
                      slots={{
                        day: (props: PickerDayProps) => (
                          <NoteDay
                            {...props}
                            noteCountsByDay={noteCountsByDay}
                            dueDaysByDate={new Map()}
                            startDate={activeStartDate}
                            endDate={activeEndDate}
                          />
                        ),
                      }}
                      sx={{
                        "& .MuiPickersCalendarHeader-label": {
                          color: colors.blueGrey[100],
                        },
                        "& .MuiPickersArrowSwitcher-button, & .MuiPickersCalendarHeader-switchViewButton":
                          {
                            color: colors.blueGrey[200],
                          },
                        "& .MuiDayCalendar-weekDayLabel": {
                          color: colors.blueGrey[400],
                        },
                      }}
                    />
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1,
                      py: 0.75,
                      backgroundColor: colors.blueGrey[800],
                      borderTop: `1px solid ${colors.blueGrey[700]}`,
                    }}
                  >
                    {datePickerMode === "start" ? (
                      <>
                        <Button
                          variant="outlined"
                          color="info"
                          startIcon={<Icon path={mdiCalendar} size={0.9} />}
                          onClick={() => {
                            const fallbackStart = dayjs().format("YYYY-MM-DD");
                            setPendingDateFilter((prev) => ({
                              ...prev,
                              date: prev.date || fallbackStart,
                              endDate:
                                prev.endDate || prev.date || fallbackStart,
                            }));
                            setDatePickerMode("end");
                          }}
                          sx={{ textTransform: "none", fontSize: "0.75rem" }}
                        >
                          End Date
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outlined"
                        color="info"
                        startIcon={<Icon path={mdiCalendar} size={0.9} />}
                        onClick={() => setDatePickerMode("start")}
                        sx={{ textTransform: "none", fontSize: "0.75rem" }}
                      >
                        Start Date
                      </Button>
                    )}
                    <Box sx={{ flex: 1 }} />
                    <Tooltip title="Remove date filter">
                      <IconButton
                        aria-label="Remove date filter"
                        color="error"
                        onClick={() => {
                          setItemFilters((prev) => ({
                            ...prev,
                            date: "",
                            endDate: "",
                            dueDate: "",
                            hasDue: false,
                          }));
                          setDatePopoverAnchor(null);
                        }}
                      >
                        <Icon path={mdiTrashCanOutline} size={0.9} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Save date">
                      <IconButton
                        aria-label="Save date"
                        color="primary"
                        onClick={() => {
                          applyDateFilter(pendingDateFilter);
                          setDatePopoverAnchor(null);
                        }}
                        sx={{ color: colors.lightGreen[400] }}
                      >
                        <Icon path={mdiCheckCircle} size={0.9} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Popover>
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
                <Menu
                  id="labels-actions-menu"
                  anchorEl={labelsActionsAnchor}
                  open={Boolean(labelsActionsAnchor)}
                  onClose={() => setLabelsActionsAnchor(null)}
                >
                  <MenuItem
                    onClick={() => {
                      setLabelsActionsAnchor(null);
                      void selectImportFile();
                    }}
                  >
                    <Icon path={mdiUpload} size={0.8} />
                    <Box component="span" sx={{ ml: 1 }}>
                      Import JSON
                    </Box>
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setLabelsActionsAnchor(null);
                      handleExportJson();
                    }}
                  >
                    <Icon path={mdiDownload} size={0.8} />
                    <Box component="span" sx={{ ml: 1 }}>
                      Save as JSON
                    </Box>
                  </MenuItem>
                </Menu>
              </>
            )}
          </Stack>
          <Box sx={{ pt: 2 }}>
            <TabPanel value={activeTab} index="items">
              <Stack spacing={1}>
                <ItemForm
                  editingItem={editingItem}
                  initialText={sharedText ?? undefined}
                  categories={categories}
                  dueLabel={futureDueLabel}
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
                      msOverflowStyle: "none",
                      "&::-webkit-scrollbar": {
                        display: "none",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        columnGap: 0.6,
                        minWidth: "max-content",
                        height: 32,
                        pt: 0.5,
                      }}
                    >
                      {weekdayStripDays.map((day) => {
                        const dayKey = day.format("YYYY-MM-DD");
                        const weekday = day.day();
                        const isWeekend = weekday === 0 || weekday === 6;
                        const isSelected =
                          (draftDueDate
                            ? draftDueDate.format("YYYY-MM-DD")
                            : itemFilters.weekday) === dayKey;
                        const isCurrentDay = day.isSame(today, "day");
                        const hasPreviousNotes =
                          day.isBefore(today, "day") &&
                          (noteCountByDay.get(dayKey) ?? 0) > 0;
                        const hasDue = (dueCountByDay.get(dayKey) ?? 0) > 0;
                        const badgeValue = hasDue
                          ? (dueCountByDay.get(dayKey) ?? 0)
                          : (noteCountByDay.get(dayKey) ?? 0);
                        return (
                          <React.Fragment key={dayKey}>
                            {false && (
                              <Box
                                sx={{
                                  height: "25%",
                                  width: 2,
                                  backgroundColor: colors.blueGrey[500],
                                  alignSelf: "flex-end",
                                  mb: 0.5,
                                  pointerEvents: "none",
                                }}
                              />
                            )}
                            <Tooltip title={day.format("ddd, MMM D")}>
                              <Badge
                                badgeContent={badgeValue > 1 ? badgeValue : 0}
                                color={hasDue ? "warning" : "success"}
                                overlap="rectangular"
                                anchorOrigin={{
                                  vertical: "top",
                                  horizontal: "right",
                                }}
                                sx={{
                                  "& .MuiBadge-badge": {
                                    minWidth: 16,
                                    height: 16,
                                    fontSize: "0.65rem",
                                  },
                                }}
                              >
                                <Button
                                  variant={
                                    isSelected ? "contained" : "outlined"
                                  }
                                  onClick={() => handleWeekdayToggle(dayKey)}
                                  sx={{
                                    minWidth: 32,
                                    width: 32,
                                    height: 32,
                                    p: 0,
                                    borderRadius: 1,
                                    fontWeight: 700,
                                    lineHeight: 1,
                                    color: isSelected
                                      ? colors.blueGrey[50]
                                      : isCurrentDay
                                        ? colors.lightBlue[100]
                                        : hasDue
                                          ? colors.orange[100]
                                          : colors.blueGrey[100],
                                    borderColor: isSelected
                                      ? colors.lightBlue[700]
                                      : isCurrentDay
                                        ? colors.lightBlue[400]
                                        : hasDue
                                          ? "rgba(255, 152, 0, 0.6)"
                                          : colors.blueGrey[600],
                                    backgroundColor: isSelected
                                      ? colors.lightBlue[700]
                                      : isCurrentDay
                                        ? "rgba(33, 150, 243, 0.32)"
                                        : hasDue
                                          ? "rgba(255, 152, 0, 0.24)"
                                          : hasPreviousNotes
                                            ? "rgba(76, 175, 80, 0.24)"
                                            : "rgba(96, 125, 139, 0.16)",
                                    "&:hover": {
                                      backgroundColor: isSelected
                                        ? colors.lightBlue[600]
                                        : hasDue
                                          ? "rgba(255, 152, 0, 0.32)"
                                          : isCurrentDay
                                            ? "rgba(33, 150, 243, 0.45)"
                                            : hasPreviousNotes
                                              ? "rgba(76, 175, 80, 0.32)"
                                              : "rgba(96, 125, 139, 0.24)",
                                      borderColor: isSelected
                                        ? colors.lightBlue[500]
                                        : isCurrentDay
                                          ? colors.lightBlue[300]
                                          : colors.blueGrey[500],
                                    },
                                  }}
                                >
                                  <Box
                                    sx={{
                                      fontSize: "0.62rem",
                                      lineHeight: 1,
                                      letterSpacing: "-0.04em",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontWeight: isWeekend ? 900 : 500,
                                      textDecoration: isWeekend
                                        ? "underline"
                                        : "none",
                                    }}
                                  >
                                    {WEEKDAY_LETTERS[weekday]}
                                  </Box>
                                </Button>
                              </Badge>
                            </Tooltip>
                          </React.Fragment>
                        );
                      })}
                    </Box>
                  </Box>
                  <Tooltip title="Set due date">
                    <Badge
                      badgeContent={dueFutureCount}
                      invisible={dueFutureCount === 0}
                      anchorOrigin={{ vertical: "top", horizontal: "right" }}
                      sx={{
                        "& .MuiBadge-badge": {
                          backgroundColor: colors.orange[400],
                          color: colors.grey[900],
                          minWidth: 14,
                          height: 14,
                          fontSize: "0.6rem",
                          lineHeight: 1,
                          p: 0,
                          top: 4,
                          right: 4,
                        },
                      }}
                    >
                      <IconButton
                        size="small"
                        aria-label="Set note due date"
                        onClick={() => {
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
                          setWeekPickerDueAmPm(
                            baseDate.hour() >= 12 ? "PM" : "AM",
                          );
                          setWeekPickerDueMinute(
                            ([0, 15, 30, 45] as const).reduce((prev, curr) =>
                              Math.abs(curr - baseDate.minute()) <
                              Math.abs(prev - baseDate.minute())
                                ? curr
                                : prev,
                            ),
                          );
                          setWeekPickerDueDialogOpen(true);
                        }}
                        sx={{
                          flexShrink: 0,
                          width: 32,
                          height: 32,
                          minWidth: 32,
                          border: `1px solid ${
                            draftDueDate || itemFilters.weekday
                              ? colors.orange[500]
                              : colors.blueGrey[600]
                          }`,
                          borderRadius: 1,
                          color:
                            draftDueDate || itemFilters.weekday
                              ? colors.orange[300]
                              : colors.blueGrey[200],
                          backgroundColor:
                            draftDueDate || itemFilters.weekday
                              ? "rgba(255, 152, 0, 0.14)"
                              : "rgba(18, 24, 31, 0.92)",
                          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                          mt: 0.5,
                          ml: 0.5,
                        }}
                      >
                        <Icon path={mdiCalendarClock} size={0.8} />
                      </IconButton>
                    </Badge>
                  </Tooltip>
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
                <ItemList
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
                <CategoryForm
                  editingCategory={editingCategory}
                  onSubmit={handleSubmit}
                  onCancelEdit={() => setEditingCategory(null)}
                />
                <CategoryList
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
        <Dialog
          open={confirmBulkDeleteOpen}
          onClose={() => setConfirmBulkDeleteOpen(false)}
        >
          <DialogTitle>Delete {selectedItemIds.size} Note(s)?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              This will permanently delete the selected notes
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              variant="outlined"
              onClick={() => setConfirmBulkDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="contained" onClick={handleBulkDelete}>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={!!confirmDeleteCategory}
          onClose={() => setConfirmDeleteCategory(null)}
        >
          <DialogTitle>
            {`Delete label "${confirmDeleteCategory?.name ?? ""}"?`}
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Deleting this label will remove it and set any notes in this label
              to have no label
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              variant="outlined"
              onClick={() => setConfirmDeleteCategory(null)}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                if (confirmDeleteCategory) {
                  handleDelete(confirmDeleteCategory);
                  setNotificationSeverity("success");
                  setNotification(
                    `Deleted label "${confirmDeleteCategory.name}"`,
                  );
                }
                setConfirmDeleteCategory(null);
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={confirmImportOpen}
          onClose={() => {
            setConfirmImportOpen(false);
            setPendingImport(null);
          }}
        >
          <DialogTitle>Import JSON file</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {pendingImport?.fileName
                ? `Importing "${pendingImport.fileName}" will replace all current labels and notes in the app`
                : "Importing a JSON file will replace all current labels and notes in the app"}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setConfirmImportOpen(false);
                setPendingImport(null);
              }}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button variant="contained" onClick={confirmImport}>
              Import
            </Button>
          </DialogActions>
        </Dialog>
        <Menu
          anchorEl={bulkCategoryAnchor}
          open={!!bulkCategoryAnchor}
          onClose={() => setBulkCategoryAnchor(null)}
        >
          <MenuItem onClick={() => handleBulkCategoryChange(null)}>
            no label
          </MenuItem>
          {categories.map((category) => (
            <MenuItem
              key={category.id}
              onClick={() => handleBulkCategoryChange(category.id)}
            >
              <Box
                component="span"
                sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
              >
                <LabelIcon
                  icon={category.icon}
                  color={category.color}
                  size={0.8}
                />
              </Box>
              {category.name}
            </MenuItem>
          ))}
        </Menu>
      </Box>
    </main>
  );
}

export default App;
