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
  Divider,
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
  mdiCheckboxMultipleMarked,
  mdiFolderMove,
  mdiTrashCan,
  mdiUpload,
  mdiDownload,
  mdiCalendar,
  mdiCheckCircle,
} from "@mdi/js";
import CategoryForm from "./components/CategoryForm";
import CategoryList from "./components/CategoryList";
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

type NoteDayProps = PickerDayProps & {
  noteCountsByDay: Map<string, number>;
  dueDaysByDate: Map<string, number>;
};

const NoteDay = ({
  day,
  noteCountsByDay,
  dueDaysByDate,
  outsideCurrentMonth,
  ...other
}: NoteDayProps) => {
  const key = dayjs(day).format("YYYY-MM-DD");
  const noteCount = noteCountsByDay.get(key) ?? 0;
  const hasNotes = noteCount > 0;
  const dueCount = dueDaysByDate.get(key) ?? 0;
  const hasDue = dueCount > 0;
  const isOutside = Boolean(outsideCurrentMonth);

  /*
     <Badge
        overlap="circular"
        badgeContent={dueCount}
        invisible={!hasDue}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        sx={{
          "& .MuiBadge-badge": {
            backgroundColor: colors.blue[400],
            color: colors.grey[900],
          },
        }}
      >
        */

  return (
    <Badge
      overlap="circular"
      badgeContent={noteCount || dueCount}
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
        {...other}
        sx={{
          color: isOutside ? colors.blueGrey[500] : colors.blueGrey[100],
          opacity: isOutside ? 0.6 : 1,
          "&:hover, &:focus": {
            backgroundColor: isOutside
              ? "rgba(96, 125, 139, 0.18)"
              : "rgba(96, 125, 139, 0.28)",
            textTransform: "lowercase",
          },
          "&.Mui-selected": {
            backgroundColor: colors.blueGrey[500],
            color: colors.blueGrey[900],
            borderColor: colors.blueGrey[300],
            opacity: 1,
          },
          "&.Mui-selected:hover, &.Mui-selected:focus": {
            backgroundColor: colors.blueGrey[400],
          },
          ...(hasNotes
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
          ...(hasDue && !hasNotes
            ? {
                border: `2px solid ${colors.orange[400]}`,
                color: colors.orange[200],
                backgroundColor: isOutside
                  ? "rgba(255, 152, 0, 0.12)"
                  : "rgba(255, 152, 0, 0.2)",
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
    dueDate: string;
    hasDue: boolean;
  }>(emptyItemFilters);
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
    if (editingItem) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? { ...item, categoryId, text: values.text }
            : item,
        ),
      );
      setEditingItem(null);
      return;
    }

    setItems((prev) => {
      const createdAt = getUniqueCreatedAt(prev);

      return [
        ...prev,
        {
          id: String(createdAt),
          categoryId,
          text: values.text,
          createdAt,
          hasNotification: true,
        },
      ];
    });
    setNotification(`${categoryName}: ${values.text}`);
    void showAppNotification(categoryName, values.text).then(
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
  };

  const handleItemPin = (item: Item) => {
    setItems((prev) =>
      prev.map((existingItem) =>
        existingItem.id === item.id
          ? { ...existingItem, pinned: !existingItem.pinned }
          : existingItem,
      ),
    );
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
        );
      }),
    [itemFilters.categoryId, parsedTextFilters, sortedItems],
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

  const filteredMaxDate = useMemo(() => {
    if (calendarFilteredItems.length === 0) {
      return today;
    }
    const maxTimestamp = Math.max(
      ...calendarFilteredItems.map((item) => item.createdAt),
    );
    const latestFiltered = dayjs.unix(maxTimestamp).startOf("day");
    return latestFiltered.isAfter(today) ? today : latestFiltered;
  }, [calendarFilteredItems, today]);

  const dueDaysByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      if (item.due !== undefined) {
        const dueDay = dayjs.unix(item.due).startOf("day");
        if (!dueDay.isBefore(today)) {
          const key = dueDay.format("YYYY-MM-DD");
          map.set(key, (map.get(key) ?? 0) + 1);
        }
      }
    }
    return map;
  }, [items, today]);

  const calendarMaxDate = useMemo(() => {
    if (dueDaysByDate.size === 0) return filteredMaxDate;
    const endOfNextMonth = today.add(1, "month").endOf("month").startOf("day");
    return endOfNextMonth.isAfter(filteredMaxDate)
      ? endOfNextMonth
      : filteredMaxDate;
  }, [dueDaysByDate, filteredMaxDate, today]);

  const dueFutureCount = useMemo(() => {
    const todayUnix = today.unix();
    return items.filter(
      (item) => item.due !== undefined && item.due >= todayUnix,
    ).length;
  }, [items, today]);

  const CalendarDay = (props: PickerDayProps) => (
    <NoteDay
      {...props}
      noteCountsByDay={noteCountsByDay}
      dueDaysByDate={dueDaysByDate}
    />
  );

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

  return (
    <Box>
      <Paper sx={{ p: 1 }}>
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Tabs
            value={activeTab}
            sx={{ "& .MuiTab-root": { minWidth: 0, px: 1.5 } }}
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
              id="tab-items"
              aria-controls="tabpanel-items"
            />
            <Tab
              value="categories"
              label="Labels"
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
                  <Badge badgeContent={selectedItemIds.size} color="primary">
                    <Icon path={mdiCheckboxMultipleMarked} size={0.9} />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Tooltip title="Filter by date">
                <IconButton
                  aria-label="Filter by date"
                  color={isDatePopoverOpen ? "primary" : "default"}
                  onClick={(event) => {
                    if (isDatePopoverOpen) {
                      setDatePopoverAnchor(null);
                      return;
                    }
                    setPendingDateFilter({
                      date: itemFilters.date,
                      endDate: itemFilters.endDate,
                      dueDate: itemFilters.dueDate,
                      hasDue: itemFilters.hasDue,
                    });
                    setDatePickerMode("start");
                    setDatePopoverAnchor(event.currentTarget);
                  }}
                  disabled={items.length === 0 || selectMode}
                >
                  <Badge
                    variant="dot"
                    invisible={
                      !itemFilters.date &&
                      !itemFilters.endDate &&
                      !itemFilters.dueDate &&
                      !itemFilters.hasDue
                    }
                    sx={{
                      "& .MuiBadge-badge": {
                        backgroundColor: colors.lightGreen[400],
                      },
                    }}
                  >
                    <Badge
                      badgeContent={dueFutureCount}
                      invisible={dueFutureCount === 0}
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
                      <Icon path={mdiCalendar} size={0.9} />
                    </Badge>
                  </Badge>
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
                      p: 1,
                      minWidth: 320,
                    },
                  },
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: colors.blueGrey[100],
                    px: 1,
                    pb: 0.5,
                    textAlign: "center",
                    backgroundColor: colors.blueGrey[700],
                  }}
                >
                  {datePickerMode === "start" ? "Start Date" : "End Date"}
                </Typography>
                <DateCalendar
                  value={
                    datePickerMode === "start" ? activeStartDate : activeEndDate
                  }
                  onChange={(value: Dayjs | null) => {
                    if (!value) return;
                    const next = value.format("YYYY-MM-DD");
                    if (datePickerMode === "start") {
                      setPendingDateFilter((prev) => ({
                        ...prev,
                        date: next,
                        dueDate: "",
                        endDate:
                          prev.endDate && prev.endDate < next
                            ? next
                            : prev.endDate,
                      }));
                      return;
                    }
                    setPendingDateFilter((prev) => ({
                      ...prev,
                      endDate: next,
                      dueDate: "",
                    }));
                  }}
                  showDaysOutsideCurrentMonth
                  minDate={
                    datePickerMode === "start"
                      ? filteredMinDate
                      : (activeStartDate ?? filteredMinDate)
                  }
                  maxDate={calendarMaxDate}
                  slots={{ day: CalendarDay }}
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
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 1,
                    pt: 0.5,
                  }}
                >
                  {datePickerMode === "start" ? (
                    <>
                      <Button
                        variant="outlined"
                        color="warning"
                        onClick={() =>
                          setPendingDateFilter((prev) => ({
                            ...prev,
                            hasDue: !prev.hasDue,
                          }))
                        }
                        sx={{ textTransform: "none", fontSize: "0.75rem" }}
                      >
                        {pendingDateFilter.hasDue ? "All" : "Due"}
                      </Button>
                      <Button
                        variant="outlined"
                        color="info"
                        onClick={() => {
                          const fallbackStart = dayjs().format("YYYY-MM-DD");
                          setPendingDateFilter((prev) => ({
                            ...prev,
                            date: prev.date || fallbackStart,
                            endDate: prev.endDate || prev.date || fallbackStart,
                            dueDate: "",
                          }));
                          setDatePickerMode("end");
                        }}
                        sx={{ textTransform: "none", fontSize: "0.75rem" }}
                      >
                        End
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outlined"
                      color="info"
                      onClick={() => setDatePickerMode("start")}
                      sx={{ textTransform: "none", fontSize: "0.75rem" }}
                    >
                      Start
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
                      <Icon path={mdiTrashCan} size={0.9} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Cancel date">
                    <IconButton
                      aria-label="Cancel date"
                      color="primary"
                      onClick={() => setDatePopoverAnchor(null)}
                    >
                      <Icon path={mdiCancel} size={0.9} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Save date">
                    <IconButton
                      aria-label="Save date"
                      color="primary"
                      onClick={() => {
                        setItemFilters((prev) => ({
                          ...prev,
                          date: pendingDateFilter.date,
                          endDate: pendingDateFilter.endDate,
                          dueDate: pendingDateFilter.dueDate,
                          hasDue: pendingDateFilter.hasDue,
                        }));
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
        </Stack>
        <Box sx={{ pt: 2 }}>
          <TabPanel value={activeTab} index="items">
            <Stack spacing={1}>
              <ItemForm
                editingItem={editingItem}
                initialText={sharedText ?? undefined}
                categories={categories}
                onSubmit={handleItemSubmit}
                onCancelEdit={() => setEditingItem(null)}
                onFilterTextChange={handleFilterTextChange}
                onFilterCategoryChange={handleFilterCategoryChange}
              />
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
                        startIcon={<Icon path={mdiTrashCan} size={0.9} />}
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
              <Divider sx={{ pt: 1 }} />
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  width: "100%",
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                  rowGap: 1,
                }}
              >
                <Tooltip title="Import data from JSON file">
                  <span>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={selectImportFile}
                      startIcon={<Icon path={mdiUpload} size={0.9} />}
                    >
                      Import JSON
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title="Save current data to JSON file">
                  <span>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleExportJson}
                      startIcon={<Icon path={mdiDownload} size={0.9} />}
                    >
                      Save as JSON
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>
          </TabPanel>
        </Box>
      </Paper>
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
          No label
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
  );
}

export default App;
