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
  colors,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Tooltip,
} from "@mui/material";
import { Icon } from "@mdi/react";
import {
  mdiCheckboxMultipleMarked,
  mdiCalendar,
  mdiEmoticonOutline,
  mdiNoteText,
  mdiLabelMultiple,
  mdiFileImport,
  mdiInformationOutline,
  mdiMinusCircle,
} from "@mdi/js";
import LabelForm from "./components/LabelForm";
import LabelList from "./components/LabelList";
import StatusForm from "./components/StatusForm";
import StatusList from "./components/StatusList";
import DueDateDialog from "./components/dialogs/DueDateDialog";
import NoteForm from "./components/NoteForm";
import NoteList from "./components/NoteList";
import HashtagBar from "./components/HashtagBar";
import WeekdayPicker from "./components/WeekdayPicker";
import TabPanel from "./components/ui/TabPanel";
import DateFilterPopover from "./components/dialogs/DateFilterPopover";
import LabelsActionsMenu from "./components/dialogs/ImportActionsMenu";
import BulkLabelMenu from "./components/dialogs/LabelMenu";
import ConfirmBulkDeleteDialog from "./components/dialogs/ConfirmBulkDeleteDialog";
import ConfirmDeleteLabelDialog from "./components/dialogs/ConfirmDeleteLabelDialog";
import ConfirmImportDialog from "./components/dialogs/ConfirmImportDialog";
import SelectModeActions from "./components/dialogs/SelectModeActions";
import NoteStorageInfoDialog from "./components/dialogs/NoteStorageInfoDialog";
import type {
  BeforeInstallPromptEvent,
  Label,
  Note,
  Status,
  StatusFormValues,
} from "./types";
import dayjs, { type Dayjs } from "dayjs";
import {
  DEFAULT_FILE_NAME,
  deserializeState,
  enableGoogleDriveFromQuery,
  getPersistedFileName,
  loadPersistedState,
  openPersistedStateFile,
  parsePersistedState,
  savePersistedState,
  serializeState,
} from "./utils/storage";
import {
  type AppNotificationResult,
  showAppNotification,
} from "./utils/notifications";
import {
  emptyNoteFilters,
  matchesTextFilters,
  NO_LABEL_FILTER_VALUE,
  parseTextFilters,
} from "./utils/noteFilters";
import { dateRegex, formatDate, isToday } from "./utils/formatTimestamp";
import { getUniqueCreatedAt } from "./utils/noteTimestamps";
import { getStatusTextStyle } from "./utils/statusStyles";
type TabValue = "notes" | "labels" | "statuses";

const BULLET_PREFIX = "• ";
const CHECKBOX_PREFIX_PATTERN = /^\[ ?[xX]? ?\]\s?/;
const HIDE_TOP_BAR_INFO_STORAGE_KEY = "adnothed-hide-topbar-info";
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
const SHORT_MONTH_LOOKUP: Record<string, number> = {
  jan: 0,
  fev: 1,
  feb: 1,
  mar: 2,
  abr: 3,
  apr: 3,
  mai: 4,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  aug: 7,
  set: 8,
  sep: 8,
  out: 9,
  oct: 9,
  nov: 10,
  dez: 11,
  dec: 11,
};

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
  const [activeTab, setActiveTab] = useState<TabValue>("notes");
  const [labels, setLabels] = useState<Label[]>([]);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingNote, seteditingNote] = useState<Note | null>(null);
  const [cloneNote, setCloneNote] = useState<Note | null>(null);
  const [recentlyAddednoteId, setRecentlyAddedNoteId] = useState<string | null>(
    null,
  );
  const [recentlyEditednoteId, setRecentlyEditedNoteId] = useState<
    string | null
  >(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [notificationSeverity, setNotificationSeverity] = useState<
    "success" | "error" | "info" | "warning"
  >("success");
  const [noteFilters, setNoteFilters] = useState(emptyNoteFilters);
  const [selectMode, setSelectMode] = useState(false);
  const [selectednoteIds, setSelectedNoteIds] = useState<Set<string>>(
    new Set(),
  );
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [bulkLabelAnchor, setbulkLabelAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [labelsActionsAnchor, setLabelsActionsAnchor] =
    useState<HTMLElement | null>(null);
  const [confirmDeleteLabel, setconfirmDeleteLabel] = useState<Label | null>(
    null,
  );
  const [latestlabelId, setLatestlabelId] = useState<string | null>(null);
  const [latestStatusId, setLatestStatusId] = useState<string | null>(null);
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    labels: Label[];
    statuses: Status[];
    notes: Note[];
    fileName: string;
    parseError: string | null;
  } | null>(null);
  const [pendingGoogleDriveImport, setPendingGoogleDriveImport] =
    useState(false);
  const [bulkStatusAnchor, setBulkStatusAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [noteStorageInfoOpen, setNoteStorageInfoOpen] = useState(false);
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
  }>(emptyNoteFilters);
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
  const [hideTopBarInfoButton, setHideTopBarInfoButton] = useState<boolean>(
    () => {
      if (typeof window === "undefined") {
        return false;
      }
      return (
        window.localStorage.getItem(HIDE_TOP_BAR_INFO_STORAGE_KEY) === "true"
      );
    },
  );
  const topToolbarRef = useRef<HTMLDivElement | null>(null);
  const notesActionsRef = useRef<HTMLDivElement | null>(null);
  const [showStatusTabOnNotes, setShowStatusTabOnNotes] = useState(true);

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
    enableGoogleDriveFromQuery();
  }, []);

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
        return;
      }

      if (
        event.data &&
        (event.data as { type: string }).type === "SHARE_TEXT"
      ) {
        const text = (event.data as { text: string }).text;
        const url = (event.data as { url?: string }).url;

        if (navigator.share) {
          void navigator.share({
            text,
            ...(url ? { url } : {}),
          });
          return;
        }

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

  const handleNeverShowInfoTipsAgain = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(HIDE_TOP_BAR_INFO_STORAGE_KEY, "true");
    }
    setHideTopBarInfoButton(true);
    setNoteStorageInfoOpen(false);
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

      setLabels(persistedState.labels);
      setStatuses(persistedState.statuses ?? []);
      setNotes(persistedState.notes);
      setStorageFileName(persistedState.fileName);
      if (persistedState.parseError) {
        setNotificationSeverity("error");
        setNotification(persistedState.parseError);
      }
      setStorageReady(true);
      setActiveTab("notes");
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

    savePersistedState({ labels, statuses, notes }, storageFileName);
  }, [labels, statuses, notes, storageReady, storageFileName]);

  useEffect(() => {
    if (!storageReady) {
      setActiveTab("labels");
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

  const applyImportedState = (next: {
    labels: Label[];
    statuses: Status[];
    notes: Note[];
    fileName: string;
    parseError?: string | null;
  }) => {
    setLabels(next.labels);
    setStatuses(next.statuses ?? []);
    setNotes(next.notes);
    setStorageFileName(next.fileName);
    setStorageReady(true);
    setActiveTab("notes");
    if (next.parseError) {
      setNotificationSeverity("error");
      setNotification(next.parseError);
      return;
    }
    setNotificationSeverity("success");
    setNotification(`Imported ${next.fileName}`);
  };

  const confirmImport = () => {
    if (pendingGoogleDriveImport) {
      setPendingGoogleDriveImport(false);
      setConfirmImportOpen(false);
      void handleImportFromGoogleDrive();
      return;
    }

    if (!pendingImport) {
      setConfirmImportOpen(false);
      return;
    }
    applyImportedState(pendingImport);
    setPendingImport(null);
    setConfirmImportOpen(false);
  };

  const handleImportFromGoogleDrive = async () => {
    try {
      if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        setNotificationSeverity("error");
        setNotification(
          "Google Drive import is not configured. Set VITE_GOOGLE_CLIENT_ID in your environment.",
        );
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const existingScript = document.querySelector(
          'script[src="https://accounts.google.com/gsi/client"]',
        );

        if (existingScript) {
          if (window.google?.accounts?.oauth2) {
            resolve();
            return;
          }
          existingScript.addEventListener("load", () => resolve(), {
            once: true,
          });
          existingScript.addEventListener(
            "error",
            () => reject(new Error("Failed to load Google Identity Services.")),
            { once: true },
          );
          return;
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => {
          reject(new Error("Failed to load Google Identity Services."));
        };
        document.head.appendChild(script);
      });

      const googleAccounts = window.google?.accounts;
      const googleOauth2 = googleAccounts?.oauth2;
      if (!googleOauth2) {
        setNotificationSeverity("error");
        setNotification("Google Drive authentication is not available yet.");
        return;
      }

      const accessToken = await new Promise<string>((resolve, reject) => {
        const tokenClient = googleOauth2.initTokenClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          scope: "https://www.googleapis.com/auth/drive.file",
          callback: (response) => {
            if (response.error) {
              reject(new Error(response.error));
              return;
            }
            if (!response.access_token) {
              reject(new Error("Google Drive access token was not returned."));
              return;
            }
            resolve(response.access_token);
          },
        });
        tokenClient.requestAccessToken();
      });

      const driveHeaders = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };

      const folderResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("name='adnothed' and mimeType='application/vnd.google-apps.folder' and trashed=false")}&spaces=drive&fields=files(id,name)`,
        { headers: driveHeaders },
      );

      if (!folderResponse.ok) {
        const errorText = await folderResponse.text();
        throw new Error(
          `Google Drive folder lookup failed: ${folderResponse.status} ${folderResponse.statusText}${errorText ? ` - ${errorText}` : ""}`,
        );
      }

      const folderData = (await folderResponse.json()) as {
        files?: Array<{ id: string; name: string }>;
      };
      const folderId = folderData.files?.[0]?.id;
      if (!folderId) {
        throw new Error("No adnothed folder was found in Google Drive.");
      }

      const filesResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${folderId}' in parents and trashed=false and mimeType='application/json'`)}&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime)`,
        { headers: driveHeaders },
      );

      if (!filesResponse.ok) {
        const errorText = await filesResponse.text();
        throw new Error(
          `Google Drive file lookup failed: ${filesResponse.status} ${filesResponse.statusText}${errorText ? ` - ${errorText}` : ""}`,
        );
      }

      const filesData = (await filesResponse.json()) as {
        files?: Array<{ id: string; name: string }>;
      };
      const latestFile = filesData.files?.[0];
      if (!latestFile) {
        throw new Error(
          "No JSON backup files were found in the adnothed Google Drive folder.",
        );
      }

      const importResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${latestFile.id}?alt=media`,
        { headers: driveHeaders },
      );

      if (!importResponse.ok) {
        const errorText = await importResponse.text();
        throw new Error(
          `Google Drive file download failed: ${importResponse.status} ${importResponse.statusText}${errorText ? ` - ${errorText}` : ""}`,
        );
      }

      const raw = await importResponse.text();
      const parsedState = parsePersistedState(raw);
      if (parsedState.error) {
        setNotificationSeverity("error");
        setNotification(parsedState.error);
        return;
      }

      const importedState = deserializeState(parsedState.state);
      const imported = {
        labels: importedState.labels,
        statuses: importedState.statuses,
        notes: importedState.notes,
        fileName: latestFile.name,
      };
      applyImportedState(imported);
      setNotificationSeverity("success");
      setNotification(`Imported ${latestFile.name} from Google Drive`);
    } catch (error) {
      setNotificationSeverity("error");
      setNotification(
        error instanceof Error
          ? error.message
          : "Failed to import from Google Drive.",
      );
    }
  };

  const handleExportJson = () => {
    const payload = serializeState({ labels, statuses, notes });
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

    // ensure the icon is unique across labels
    const conflict = labels.some(
      (c) => c.id === iconName && c.id !== editingLabel?.id,
    );
    if (conflict) {
      setNotificationSeverity("error");
      setNotification("A label with that icon already exists.");
      return false;
    }

    if (editingLabel) {
      setLabels((prev) =>
        prev.map((prevLabel) => {
          if (prevLabel.id === editingLabel.id) {
            setNotes((prev) =>
              prev.map((note) =>
                note.labelId === prevLabel.id
                  ? { ...note, labelId: iconName }
                  : note,
              ),
            );

            return {
              ...prevLabel,
              name: values.name,
              icon: values.icon,
              color: values.color,
              id: iconName,
            };
          }

          return prevLabel;
        }),
      );
      setNotificationSeverity("success");
      setNotification(`Updated label "${values.name}"`);
      setEditingLabel(null);
      return;
    }

    setLabels((prev) => [
      ...prev,
      {
        id: iconName,
        name: values.name,
        icon: values.icon,
        color: values.color,
      },
    ]);
    setLatestlabelId(iconName);
    setNotificationSeverity("success");
    setNotification(`Added label "${values.name}"`);
  };

  const handleDelete = (label: Label) => {
    setLabels((prev) => prev.filter((c) => c.id !== label.id));
    setNotes((prev) =>
      prev.map((note) =>
        note.labelId === label.id ? { ...note, labelId: null } : note,
      ),
    );
    if (editingLabel?.id === label.id) {
      setEditingLabel(null);
    }
    if (editingNote?.labelId === label.id) {
      seteditingNote(null);
    }
  };

  const handleStatusSubmit: (values: StatusFormValues) => boolean | void = (
    values,
  ) => {
    const emoji = values.emoji.trim();
    const conflict = statuses.some(
      (status) => status.emoji === emoji && status.id !== editingStatus?.id,
    );
    if (!emoji) {
      return false;
    }
    if (conflict) {
      setNotificationSeverity("error");
      setNotification("A status with that emoji already exists.");
      return false;
    }

    if (editingStatus) {
      setStatuses((prev) =>
        prev.map((status) =>
          status.id === editingStatus.id
            ? {
                ...status,
                name: values.name,
                emoji,
                format: values.format,
                id: emoji,
              }
            : status,
        ),
      );
      setNotes((prev) =>
        prev.map((note) =>
          note.emoji === editingStatus.emoji ? { ...note, emoji } : note,
        ),
      );
      setNotificationSeverity("success");
      setNotification(`Updated status "${values.name}"`);
      setEditingStatus(null);
      return;
    }

    setStatuses((prev) => [
      ...prev,
      {
        id: emoji,
        name: values.name,
        emoji,
        format: values.format,
      },
    ]);
    setLatestStatusId(emoji);
    setNotificationSeverity("success");
    setNotification(`Added status "${values.name}"`);
  };

  const handleStatusDelete = (status: Status) => {
    setStatuses((prev) => prev.filter((item) => item.id !== status.id));
    setNotes((prev) =>
      prev.map((note) =>
        note.emoji === status.emoji ? { ...note, emoji: undefined } : note,
      ),
    );
    if (editingStatus?.id === status.id) {
      setEditingStatus(null);
    }
  };

  const requestDeleteLabel = (label: Label) => {
    setconfirmDeleteLabel(label);
  };

  const parseDueTimeFromText = (
    text: string,
    selectedDay: Dayjs | null,
  ): {
    cleanedText: string;
    dueTimestamp?: number;
    openCalendar?: boolean;
  } => {
    const baseDate = selectedDay && selectedDay.isValid() ? selectedDay : today;
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

    const monthDateMatch =
      /(^|[\s(])(\d{1,2})(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|feb|apr|may|aug|sep|oct|dec)(g)?(?=$|[\s)\],;.!?])/i.exec(
        workingText,
      );

    if (monthDateMatch) {
      const dayValue = Number.parseInt(monthDateMatch[2], 10);
      const monthValue = SHORT_MONTH_LOOKUP[monthDateMatch[3].toLowerCase()];
      if (!Number.isInteger(dayValue) || dayValue < 1 || dayValue > 31) {
        return { cleanedText: textWithToday };
      }

      const currentMonth = today.month();
      const isSameMonth = monthValue === currentMonth;
      const isLaterOrSameDayInCurrentMonth =
        !isSameMonth || dayValue >= today.date();
      const year =
        monthValue > currentMonth ||
        (isSameMonth && isLaterOrSameDayInCurrentMonth)
          ? today.year()
          : today.year() + 1;
      const parsedDate = dayjs(
        `${year}-${String(monthValue + 1).padStart(2, "0")}-${String(dayValue).padStart(2, "0")}`,
        "YYYY-MM-DD",
        true,
      );

      if (!parsedDate.isValid()) {
        return { cleanedText: textWithToday };
      }

      const dateText = workingText
        .replace(monthDateMatch[0], monthDateMatch[1] ?? "")
        .replace(/\s{2,}/g, " ")
        .trim();

      const timeMatch =
        /(^|[\s(])((?:[01]?\d|2[0-3]):(?:0|5|10|15|20|25|30|35|40|45|50|55)|(?:[01]?\d|2[0-3])h(?:0|5|10|15|20|25|30|35|40|45|50|55)?)(g)?(?=$|[\s)\],;.!?])/i.exec(
          dateText,
        );

      if (!timeMatch) {
        return {
          cleanedText: dateText,
          dueTimestamp: parsedDate
            .clone()
            .hour(0)
            .minute(0)
            .second(0)
            .millisecond(0)
            .unix(),
          openCalendar: Boolean(monthDateMatch[4]),
        };
      }

      const rawToken = timeMatch[2].toLowerCase();
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

      if (
        !isHourSyntax &&
        ![0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].includes(minute)
      ) {
        return { cleanedText: textWithToday };
      }

      if (
        isHourSyntax &&
        ![0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].includes(minute) &&
        rawToken !== `${hour}h`
      ) {
        return { cleanedText: textWithToday };
      }

      const finalDue = parsedDate
        .clone()
        .hour(hour)
        .minute(minute)
        .second(0)
        .millisecond(0);

      const cleanedText = dateText
        .replace(timeMatch[0], timeMatch[1] ?? "")
        .replace(/\s{2,}/g, " ")
        .trim();

      return {
        cleanedText,
        dueTimestamp: finalDue.unix(),
        openCalendar: Boolean(monthDateMatch[4] || timeMatch[3]),
      };
    }

    const match =
      /(^|[\s(])((?:[01]?\d|2[0-3]):(?:0|5|10|15|20|25|30|35|40|45|50|55)|(?:[01]?\d|2[0-3])h(?:0|5|10|15|20|25|30|35|40|45|50|55)?)(g)?(?=$|[\s)\],;.!?])/i.exec(
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

    if (
      !isHourSyntax &&
      ![0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].includes(minute)
    ) {
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

  const handleNoteSubmit: React.ComponentProps<typeof NoteForm>["onSubmit"] = (
    values,
  ) => {
    const labelId = values.labelId === "" ? null : values.labelId;
    const labelName = labels.find((c) => c.id === labelId)?.name ?? "Reminder";
    const selectedDay =
      draftDueDate ??
      (noteFilters.weekday
        ? dayjs(noteFilters.weekday, "YYYY-MM-DD", true)
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
      const eventText = finalText || labelName;
      const start = dayjs.unix(finalDueTimestamp).second(0).millisecond(0);
      openGoogleCalendarWithText(eventText, start);
    }

    if (editingNote) {
      setNotes((prev) =>
        prev.map((note) =>
          note.id === editingNote.id
            ? {
                ...note,
                labelId,
                text: finalText,
                ...(finalDueTimestamp !== undefined
                  ? { due: finalDueTimestamp }
                  : {}),
              }
            : note,
        ),
      );
      setRecentlyAddedNoteId(null);
      setRecentlyEditedNoteId(editingNote.id);
      setDraftNoteText("");
      setDraftDueDate(null);
      seteditingNote(null);
      setCloneNote(null);
      return;
    }

    setNotes((prev) => {
      const createdAt = getUniqueCreatedAt(prev);
      const id = String(createdAt);

      setRecentlyAddedNoteId(id);
      setRecentlyEditedNoteId(null);

      return [
        ...prev,
        {
          id,
          labelId,
          text: finalText,
          createdAt,
          hasNotification: true,
          ...(finalDueTimestamp !== undefined
            ? { due: finalDueTimestamp }
            : {}),
        },
      ];
    });
    setNoteFilters(emptyNoteFilters);
    setPendingDateFilter(emptyNoteFilters);
    setDraftNoteText("");
    setDraftDueDate(null);
    setCloneNote(null);
    setNotification(`${labelName}: ${finalText}`);
    void showAppNotification(labelName, finalText).then(
      handleNotificationResult,
    );
  };

  const handleNoteCopy = (note: Note) => {
    navigator.clipboard.writeText(note.text);
    setNotificationSeverity("success");
    setNotification("Note Copied");
  };

  const handleNoteShareLink = (note: Note) => {
    const url = `${window.location.origin}${window.location.pathname}?text=${encodeURIComponent(
      note.text,
    )}`;
    if (navigator.share) {
      void navigator.share({ url });
    } else {
      void navigator.clipboard.writeText(url);
      setNotificationSeverity("success");
      setNotification("Link Copied");
    }
  };

  const handleNoteDelete = (note: Note) => {
    setNotes((prev) => prev.filter((i) => i.id !== note.id));
    if (editingNote?.id === note.id) {
      seteditingNote(null);
    }
  };

  const handleNoteToggleBullet = (note: Note) => {
    const nextText = toggleBulletRows(note.text);
    setNotes((prev) =>
      prev.map((existingNote) =>
        existingNote.id === note.id
          ? { ...existingNote, text: nextText }
          : existingNote,
      ),
    );
    setRecentlyAddedNoteId(null);
    setRecentlyEditedNoteId(note.id);
    if (editingNote?.id === note.id) {
      seteditingNote({ ...editingNote, text: nextText });
    }
  };

  const handleNoteAddCheckboxes = (note: Note) => {
    const rows = note.text.split("\n");
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
    setNotes((prev) =>
      prev.map((existingNote) =>
        existingNote.id === note.id
          ? { ...existingNote, text: nextText }
          : existingNote,
      ),
    );
    setRecentlyAddedNoteId(null);
    setRecentlyEditedNoteId(note.id);
    if (editingNote?.id === note.id) {
      seteditingNote({ ...editingNote, text: nextText });
    }
  };

  const handleNoteToggleCheckbox = (note: Note, rowIndex: number) => {
    const nextText = note.text
      .split("\n")
      .map((row, index) => {
        if (index !== rowIndex) return row;
        return row.replace(/^\[ ?([xX])? ?\]/, (_match, checked) =>
          checked ? "[ ]" : "[x]",
        );
      })
      .join("\n");
    setNotes((prev) =>
      prev.map((existingNote) =>
        existingNote.id === note.id
          ? { ...existingNote, text: nextText }
          : existingNote,
      ),
    );
    setRecentlyAddedNoteId(null);
    setRecentlyEditedNoteId(note.id);
    if (editingNote?.id === note.id) {
      seteditingNote({ ...editingNote, text: nextText });
    }
  };

  const clearSelectMode = () => {
    setSelectMode(false);
    setSelectedNoteIds(new Set());
    setBulkStatusAnchor(null);
  };

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedNoteIds(new Set());
  };

  const toggleNoteSelected = (id: string) => {
    setSelectedNoteIds((prev) => {
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
    if (notes.length === 0 && selectMode) {
      setSelectMode(false);
      setSelectedNoteIds(new Set());
    }
  }, [notes.length, selectMode]);

  const handleBulkDelete = () => {
    setNotes((prev) => prev.filter((note) => !selectednoteIds.has(note.id)));
    setSelectedNoteIds(new Set());
    setConfirmBulkDeleteOpen(false);
  };

  const handleBulkPinToggle = () => {
    if (selectednoteIds.size === 0) {
      return;
    }

    const selectedNotes = notes.filter((note) => selectednoteIds.has(note.id));
    const shouldPin = !selectedNotes.every((note) => note.pinned);

    setNotes((prev) =>
      prev.map((note) =>
        selectednoteIds.has(note.id) ? { ...note, pinned: shouldPin } : note,
      ),
    );
  };

  const handleBulkArchiveToggle = () => {
    if (selectednoteIds.size === 0) {
      return;
    }

    const selectedNotes = notes.filter((note) => selectednoteIds.has(note.id));
    const shouldArchive = !selectedNotes.every((note) => note.archived);

    setNotes((prev) =>
      prev.map((note) =>
        selectednoteIds.has(note.id)
          ? { ...note, archived: shouldArchive }
          : note,
      ),
    );
  };

  const handleBulkStatusChange = (emoji: string | null) => {
    if (selectednoteIds.size === 0) {
      return;
    }

    setNotes((prev) =>
      prev.map((note) =>
        selectednoteIds.has(note.id)
          ? { ...note, emoji: emoji ?? undefined }
          : note,
      ),
    );
    setBulkStatusAnchor(null);
  };

  const handleBulkShareText = async () => {
    if (selectednoteIds.size === 0) {
      return;
    }

    const selectedNotes = notes.filter((note) => selectednoteIds.has(note.id));
    const text = selectedNotes
      .map((note) => note.text.trim())
      .filter(Boolean)
      .join("\n\n");

    if (!text) {
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setNotificationSeverity("success");
      setNotification(`Copied ${selectedNotes.length} note(s) as text`);
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setNotificationSeverity("success");
        setNotification(`Copied ${selectedNotes.length} note(s) as text`);
      } catch {
        setNotificationSeverity("error");
        setNotification("Unable to share selected notes");
      }
    }
  };

  const handleBulkLabelChange = (labelId: string | null) => {
    setNotes((prev) =>
      prev.map((note) =>
        selectednoteIds.has(note.id) ? { ...note, labelId } : note,
      ),
    );
    setSelectedNoteIds(new Set());
    setbulkLabelAnchor(null);
  };

  const handleEditNote = (note: Note) => {
    setDatePopoverAnchor(null);
    setCloneNote(null);
    seteditingNote(note);
    setDraftNoteText(note.text);
  };

  const handleCancelEditNote = () => {
    setDraftNoteText("");
    setDraftDueDate(null);
    setCloneNote(null);
    seteditingNote(null);
  };

  const handleCloneNote = (note: Note) => {
    setDatePopoverAnchor(null);
    seteditingNote(null);
    setCloneNote(note);
    setDraftNoteText(note.text);
  };

  const handleNoteDueChange = (note: Note, due: number | null) => {
    setNotes((prev) =>
      prev.map((existingNote) =>
        existingNote.id === note.id
          ? { ...existingNote, due: due ?? undefined, completed: false }
          : existingNote,
      ),
    );
    setRecentlyAddedNoteId(null);
    setRecentlyEditedNoteId(note.id);
  };

  const handleNoteComplete = (note: Note) => {
    setNotes((prev) =>
      prev.map((existingNote) =>
        existingNote.id === note.id
          ? { ...existingNote, completed: true }
          : existingNote,
      ),
    );
    setRecentlyAddedNoteId(null);
    setRecentlyEditedNoteId(note.id);
  };

  const handleNotePin = (note: Note) => {
    setNotes((prev) =>
      prev.map((existingNote) =>
        existingNote.id === note.id
          ? { ...existingNote, pinned: !existingNote.pinned }
          : existingNote,
      ),
    );
    setRecentlyAddedNoteId(null);
    setRecentlyEditedNoteId(note.id);
  };

  const handleNoteArchive = (note: Note) => {
    setNotes((prev) =>
      prev.map((existingNote) =>
        existingNote.id === note.id
          ? { ...existingNote, archived: !Boolean(existingNote.archived) }
          : existingNote,
      ),
    );
    setRecentlyAddedNoteId(null);
    setRecentlyEditedNoteId(note.id);
  };

  const handleNoteEmojiChange = (note: Note, emoji: string | null) => {
    setNotes((prev) =>
      prev.map((existingNote) =>
        existingNote.id === note.id
          ? { ...existingNote, emoji: emoji ?? undefined }
          : existingNote,
      ),
    );
    setRecentlyAddedNoteId(null);
    setRecentlyEditedNoteId(note.id);
  };

  const handleFilterTextChange = useCallback((value: string) => {
    setNoteFilters((prev) =>
      prev.text === value
        ? prev
        : {
            ...prev,
            text: value,
          },
    );
  }, []);

  const toggleHashtagInDraft = useCallback(
    (tag: string) => {
      const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;

      setDraftNoteText((prev) => {
        const trailingHashtagMatch = /(^|\s)(#[\w-]*)$/.exec(prev);

        if (trailingHashtagMatch) {
          const inputBeforeTag = prev.slice(0, trailingHashtagMatch.index);
          const leadingWhitespace = trailingHashtagMatch[1] ?? "";
          const nextValue = `${inputBeforeTag}${leadingWhitespace}${normalizedTag}`;

          if (editingNote !== null) {
            seteditingNote((current) =>
              current ? { ...current, text: nextValue } : current,
            );
          } else {
            setNoteFilters((current) =>
              current.text === nextValue
                ? current
                : { ...current, text: nextValue },
            );
          }

          return nextValue;
        }

        const tokens = prev
          .split(/\s+/)
          .map((token) => token.trim())
          .filter(Boolean);
        const nextTokens = tokens.some((token) => token === normalizedTag)
          ? tokens.filter((token) => token !== normalizedTag)
          : [...tokens, normalizedTag];
        const nextValue = nextTokens.join(" ");

        if (editingNote !== null) {
          seteditingNote((current) =>
            current ? { ...current, text: nextValue } : current,
          );
        } else {
          setNoteFilters((current) =>
            current.text === nextValue
              ? current
              : { ...current, text: nextValue },
          );
        }

        return nextValue;
      });
    },
    [editingNote],
  );

  const handleToggleHashtagFilter = useCallback((tag: string) => {
    const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;
    setNoteFilters((prev) => {
      const tokens = prev.text
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean);
      const hasTag = tokens.includes(normalizedTag);
      const nextTokens = hasTag
        ? tokens.filter((token) => token !== normalizedTag)
        : [...tokens, normalizedTag];

      return {
        ...prev,
        text: nextTokens.join(" "),
      };
    });
  }, []);

  const handleAppendHashtagToNote = useCallback((note: Note, tag: string) => {
    const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;

    setNotes((prev) => {
      const currentNote = prev.find(
        (existingNote) => existingNote.id === note.id,
      );
      const sourceText = currentNote?.text ?? note.text;
      const existingTags = new Set(
        (sourceText.match(/(?:^|\s)#[\w-]+/g) ?? []).map((token) =>
          token.trim(),
        ),
      );

      if (existingTags.has(normalizedTag)) {
        return prev;
      }

      const trimmedText = sourceText.trim();
      const nextText = trimmedText
        ? `${trimmedText}${trimmedText.endsWith(" ") ? "" : " "}${normalizedTag}`
        : normalizedTag;

      return prev.map((existingNote) =>
        existingNote.id === note.id
          ? { ...existingNote, text: nextText }
          : existingNote,
      );
    });

    setRecentlyAddedNoteId(null);
    setRecentlyEditedNoteId(note.id);
  }, []);

  const handleFilterLabelChange = useCallback((value: string) => {
    setNoteFilters((prev) =>
      prev.labelId === value
        ? prev
        : {
            ...prev,
            labelId: value,
          },
    );
  }, []);

  const handleClearFilters = useCallback(() => {
    setNoteFilters(emptyNoteFilters);
    setSelectMode(false);
    setSelectedNoteIds(new Set());
    setPendingDateFilter(emptyNoteFilters);
    setDatePopoverAnchor(null);
    setDatePickerMode("start");
    setDraftDueDate(null);
    setWeekPickerDueDialogOpen(false);
    setWeekPickerDueDate(null);
    setWeekPickerDueHour12(12);
    setWeekPickerDueAmPm("AM");
    setWeekPickerDueMinute(0);
  }, []);

  const startDateValue = noteFilters.dueDate
    ? dayjs(noteFilters.dueDate)
    : noteFilters.date &&
        dateRegex.test(noteFilters.date) &&
        noteFilters.date.length === 10
      ? dayjs(noteFilters.date)
      : null;

  const endDateValue =
    noteFilters.endDate &&
    dateRegex.test(noteFilters.endDate) &&
    noteFilters.endDate.length === 10
      ? dayjs(noteFilters.endDate)
      : null;

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => b.createdAt - a.createdAt),
    [notes],
  );

  const [availableHashtags, setAvailableHashtags] = useState<string[]>([]);
  const hashtagCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const note of notes) {
      for (const part of note.text.split(/\s+/)) {
        if (!/^#\w[\w-]*$/.test(part)) {
          continue;
        }

        counts.set(part, (counts.get(part) ?? 0) + 1);
      }
    }

    return Object.fromEntries(
      [...counts.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      ),
    );
  }, [notes]);

  const refreshAvailableHashtags = useCallback(() => {
    const tagCreatedAt = new Map<string, number>();

    for (const note of [...notes].sort((a, b) => b.createdAt - a.createdAt)) {
      for (const part of note.text.split(/\s+/)) {
        if (/^#\w[\w-]*$/.test(part)) {
          const existingCreatedAt = tagCreatedAt.get(part);
          if (
            existingCreatedAt === undefined ||
            note.createdAt > existingCreatedAt
          ) {
            tagCreatedAt.set(part, note.createdAt);
          }
        }
      }
    }

    setAvailableHashtags(
      Array.from(tagCreatedAt.entries())
        .sort(([, a], [, b]) => b - a)
        .map(([tag]) => tag),
    );
  }, [notes]);

  const hashtagSuggestions = useMemo(() => {
    if (editingNote !== null) {
      return availableHashtags;
    }

    const currentTokenMatch = draftNoteText.match(/(?:^|\s)(#?[\w-]*)$/);
    const typedTag = currentTokenMatch?.[1] ?? "";
    const normalizedType = typedTag.startsWith("#")
      ? typedTag.slice(1)
      : typedTag;

    if (!normalizedType) {
      return availableHashtags;
    }

    return availableHashtags.filter((tag) => {
      const label = tag.startsWith("#") ? tag.slice(1) : tag;
      return label.toLowerCase().includes(normalizedType.toLowerCase());
    });
  }, [availableHashtags, draftNoteText, editingNote]);

  useEffect(() => {
    refreshAvailableHashtags();
  }, [refreshAvailableHashtags]);

  const parsedTextFilters = useMemo(
    () => parseTextFilters(noteFilters.text),
    [noteFilters.text],
  );

  const calendarFilteredNotes = useMemo(
    () =>
      sortedNotes.filter((note, index) => {
        if (noteFilters.hasDue) {
          const todayUnix = dayjs().startOf("day").unix();
          if (note.due === undefined || note.due < todayUnix) {
            return false;
          }
        }

        if (noteFilters.labelId === NO_LABEL_FILTER_VALUE) {
          if (note.labelId !== null) {
            return false;
          }
        } else if (
          noteFilters.labelId &&
          note.labelId !== noteFilters.labelId
        ) {
          return false;
        }

        return matchesTextFilters(
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
        );
      }),
    [noteFilters.labelId, noteFilters.hasDue, parsedTextFilters, sortedNotes],
  );

  const filteredNoteCount = useMemo(
    () =>
      sortedNotes.filter((note, index) => {
        if (noteFilters.labelId === NO_LABEL_FILTER_VALUE) {
          if (note.labelId !== null) {
            return false;
          }
        } else if (
          noteFilters.labelId &&
          note.labelId !== noteFilters.labelId
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
          noteFilters.date.length === 10 && dateRegex.test(noteFilters.date);
        const hasEndDate =
          noteFilters.endDate.length === 10 &&
          dateRegex.test(noteFilters.endDate);

        if (hasStartDate && noteDate < noteFilters.date.trim()) {
          return false;
        }
        if (hasEndDate && noteDate > noteFilters.endDate.trim()) {
          return false;
        }
        if (noteFilters.dueDate) {
          if (!note.due || formatDate(note.due) !== noteFilters.dueDate) {
            return false;
          }
        }
        if (noteFilters.weekday !== null) {
          const noteCreatedDate = formatDate(note.createdAt);
          const noteDueDate =
            note.due !== undefined ? formatDate(note.due) : null;
          if (
            noteCreatedDate !== noteFilters.weekday &&
            noteDueDate !== noteFilters.weekday
          ) {
            return false;
          }
        }
        if (noteFilters.hasDue) {
          const todayUnix = dayjs().startOf("day").unix();
          if (note.due === undefined || note.due < todayUnix) {
            return false;
          }
        }

        return true;
      }).length,
    [
      noteFilters.labelId,
      noteFilters.date,
      noteFilters.dueDate,
      noteFilters.endDate,
      noteFilters.hasDue,
      noteFilters.weekday,
      noteFilters.text,
      parsedTextFilters,
      sortedNotes,
    ],
  );

  useEffect(() => {
    if (activeTab !== "notes") {
      setShowStatusTabOnNotes(true);
      return;
    }

    const updateShowStatusTabOnNotes = () => {
      const container = topToolbarRef.current;
      if (!container) {
        setShowStatusTabOnNotes(true);
        return;
      }

      const visibleTabs = Array.from(
        container.querySelectorAll('[role="tab"]'),
      ) as HTMLElement[];
      const actionButtons = notesActionsRef.current
        ? Array.from(notesActionsRef.current.querySelectorAll("button"))
        : [];

      const currentWidth =
        visibleTabs.reduce((sum, tab) => sum + tab.offsetWidth, 0) +
        actionButtons.reduce((sum, button) => sum + button.offsetWidth + 8, 0);
      const estimatedStatusTabWidth = 96;

      setShowStatusTabOnNotes(
        container.clientWidth >= currentWidth + estimatedStatusTabWidth,
      );
    };

    updateShowStatusTabOnNotes();

    const observer = new ResizeObserver(updateShowStatusTabOnNotes);
    const currentContainer = topToolbarRef.current;
    if (currentContainer) {
      observer.observe(currentContainer);
    }

    window.addEventListener("resize", updateShowStatusTabOnNotes);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateShowStatusTabOnNotes);
    };
  }, [activeTab, filteredNoteCount, labels.length, statuses.length]);

  const noteCountsByDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of calendarFilteredNotes) {
      const dayKey = formatDate(note.createdAt);
      counts.set(dayKey, (counts.get(dayKey) ?? 0) + 1);
    }
    return counts;
  }, [calendarFilteredNotes]);

  const oldestNoteDate = useMemo(() => {
    if (notes.length === 0) {
      return dayjs().startOf("day");
    }
    const minTimestamp = Math.min(...notes.map((note) => note.createdAt));
    return dayjs.unix(minTimestamp).startOf("day");
  }, [notes]);

  const today = useMemo(() => dayjs().startOf("day"), []);

  const filteredMinDate = useMemo(() => {
    if (calendarFilteredNotes.length === 0) {
      return oldestNoteDate;
    }
    const minTimestamp = Math.min(
      ...calendarFilteredNotes.map((note) => note.createdAt),
    );
    return dayjs.unix(minTimestamp).startOf("day");
  }, [calendarFilteredNotes, oldestNoteDate]);

  const dueFutureCount = useMemo(() => {
    const todayUnix = today.unix();
    return notes.filter(
      (note) =>
        !note.completed && note.due !== undefined && note.due >= todayUnix,
    ).length;
  }, [notes, today]);

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
    for (const note of notes) {
      const key = dayjs.unix(note.createdAt).format("YYYY-MM-DD");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [notes]);

  const dueCountByDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of notes) {
      if (note.completed || note.due === undefined) {
        continue;
      }
      const dueDay = dayjs.unix(note.due).startOf("day");
      if (dueDay.isBefore(today, "day")) {
        continue;
      }
      const key = dueDay.format("YYYY-MM-DD");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [notes, today]);

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
    setNoteFilters((prev) => ({
      ...prev,
      weekday: prev.weekday === dayKey ? null : dayKey,
      date: "",
      endDate: "",
      dueDate: "",
      hasDue: false,
    }));
  };

  const noteTextForGoogleCalendar = editingNote?.text ?? draftNoteText;

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
    setNoteFilters((prev) => ({
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
    setNoteFilters((prev) => ({
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
    setNoteFilters((prev) => ({
      ...prev,
      date: nextFilter.date,
      endDate: nextFilter.endDate,
      dueDate: "",
      hasDue: false,
    }));
  };

  const clearDateFilter = () => {
    const nextFilter = {
      ...emptyNoteFilters,
      date: "",
      endDate: "",
      dueDate: "",
      hasDue: false,
    };
    setPendingDateFilter(nextFilter);
    setNoteFilters((prev) => ({
      ...prev,
      ...nextFilter,
      weekday: null,
    }));
    setDatePickerMode("start");
  };

  const futureDueLabel = useMemo(() => {
    const selectedDay =
      draftDueDate ??
      (noteFilters.weekday
        ? dayjs(noteFilters.weekday, "YYYY-MM-DD", true)
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
      const isFutureYear = activeDay.year() !== today.year();
      const dayLabel = activeDay.isSame(today, "day")
        ? "Today"
        : isFutureYear
          ? activeDay.format("ddd, MMM D, YYYY")
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
        const dayLabel =
          selectedDay.year() !== today.year()
            ? selectedDay.format("ddd, MMM D, YYYY")
            : selectedDay.format("ddd, MMM D");
        return hasExplicitTime
          ? `${dayLabel} at ${selectedDay.format("HH:mm")}`
          : dayLabel;
      }
    }

    return undefined;
  }, [draftDueDate, draftNoteText, noteFilters.weekday, today]);

  const openWeekPickerDueDialog = () => {
    const initialDate =
      draftDueDate ??
      (noteFilters.weekday
        ? dayjs(noteFilters.weekday, "YYYY-MM-DD", true)
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
          Math.abs(curr - baseDate.minute()) <
          Math.abs(prev - baseDate.minute())
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
            ref={topToolbarRef}
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
                  newValue === "notes" ||
                  newValue === "labels" ||
                  newValue === "statuses"
                    ? newValue
                    : (String(newValue) as TabValue);
                if (normalized !== "notes") {
                  setNoteFilters(emptyNoteFilters);
                  clearSelectMode();
                }
                setActiveTab(normalized);
              }}
            >
              <Tab
                value="notes"
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
                        {sortedNotes.length}
                      </Box>
                    </Box>
                    <Box component="span">Notes</Box>
                  </Box>
                }
                id="tab-notes"
                aria-controls="tabpanel-notes"
              />
              <Tab
                value="labels"
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
                        {labels.length}
                      </Box>
                    </Box>
                    <Box component="span">Labels</Box>
                  </Box>
                }
                id="tab-labels"
                aria-controls="tabpanel-labels"
              />
              {(activeTab !== "notes" || showStatusTabOnNotes) && (
                <Tab
                  value="statuses"
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
                        <Icon path={mdiMinusCircle} size={0.75} />
                        <Box
                          component="span"
                          sx={{
                            fontSize: "0.5rem",
                            opacity: 0.8,
                            mt: 0.15,
                          }}
                        >
                          {statuses.length}
                        </Box>
                      </Box>
                      <Box component="span">Status</Box>
                    </Box>
                  }
                  id="tab-statuses"
                  aria-controls="tabpanel-statuses"
                />
              )}
            </Tabs>
            {activeTab === "notes" && (
              <Stack
                ref={notesActionsRef}
                direction="row"
                sx={{ alignItems: "center" }}
              >
                {!hideTopBarInfoButton && (
                  <Tooltip title="Info tips">
                    <IconButton
                      aria-label="Info tips"
                      color="default"
                      onClick={() => setNoteStorageInfoOpen(true)}
                    >
                      <Icon path={mdiInformationOutline} size={0.9} />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip
                  title={
                    selectMode ? "Cancel select mode" : "Select multiple notes"
                  }
                >
                  <IconButton
                    aria-label="Toggle select mode"
                    color={selectMode ? "primary" : "default"}
                    onClick={toggleSelectMode}
                    disabled={notes.length === 0}
                  >
                    <Badge
                      badgeContent={selectednoteIds.size}
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
                      noteFilters.date ||
                      noteFilters.endDate ||
                      noteFilters.dueDate ||
                      noteFilters.hasDue
                        ? "primary"
                        : "default"
                    }
                    onClick={(event) => {
                      if (isDatePopoverOpen) {
                        setDatePopoverAnchor(null);
                        return;
                      }
                      setPendingDateFilter({
                        date: noteFilters.date,
                        endDate: noteFilters.endDate,
                      });
                      setDatePickerMode("start");
                      setDatePopoverAnchor(event.currentTarget);
                    }}
                    disabled={notes.length === 0 || selectMode}
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
                  clearDateFilter={clearDateFilter}
                  filteredMinDate={filteredMinDate}
                  noteCountsByDay={noteCountsByDay}
                  today={today}
                  setDatePickerMode={setDatePickerMode}
                />
              </Stack>
            )}
            {(activeTab === "labels" || activeTab === "statuses") && (
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
                  onImportFromGoogleDrive={() => {
                    setPendingGoogleDriveImport(true);
                    setConfirmImportOpen(true);
                  }}
                  labels={labels}
                  statuses={statuses}
                  notes={notes}
                  onNotify={(severity, message) => {
                    setNotificationSeverity(severity);
                    setNotification(message);
                  }}
                  onExport={() => {
                    handleExportJson();
                  }}
                />
              </>
            )}
          </Stack>
          <NoteStorageInfoDialog
            open={noteStorageInfoOpen}
            onClose={() => setNoteStorageInfoOpen(false)}
            onNeverShowAgain={handleNeverShowInfoTipsAgain}
          />
          <Box sx={{ pt: 2 }}>
            <TabPanel value={activeTab} index="notes">
              <Stack spacing={1}>
                <NoteForm
                  editingNote={editingNote}
                  cloneNote={cloneNote}
                  initialText={sharedText ?? undefined}
                  textValue={draftNoteText}
                  labels={labels}
                  dueLabel={futureDueLabel}
                  dueFutureCount={dueFutureCount}
                  onDueDateClick={openWeekPickerDueDialog}
                  onSubmit={handleNoteSubmit}
                  onCancelEdit={handleCancelEditNote}
                  onFilterTextChange={handleFilterTextChange}
                  onFilterLabelChange={handleFilterLabelChange}
                  onClearFilters={handleClearFilters}
                  onNoteTextChange={setDraftNoteText}
                />
                <Box
                  ref={weekPickerRef}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    overflowX: "auto",
                    overflowY: "visible",
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
                        : noteFilters.weekday
                    }
                    noteCountByDay={noteCountByDay}
                    dueCountByDay={dueCountByDay}
                    onSelect={handleWeekdayToggle}
                  />
                </Box>

                <HashtagBar
                  hashtags={hashtagSuggestions}
                  hashtagCounts={hashtagCounts}
                  activeFilterText={draftNoteText}
                  onToggleHashtagInDraft={toggleHashtagInDraft}
                />

                {selectMode && (
                  <SelectModeActions
                    selectedCount={selectednoteIds.size}
                    allSelectedPinned={
                      selectednoteIds.size > 0 &&
                      [...selectednoteIds].every((id) => {
                        const note = notes.find((item) => item.id === id);
                        return note?.pinned === true;
                      })
                    }
                    allSelectedArchived={
                      selectednoteIds.size > 0 &&
                      [...selectednoteIds].every((id) => {
                        const note = notes.find((item) => item.id === id);
                        return note?.archived === true;
                      })
                    }
                    onLabelClick={(event) =>
                      setbulkLabelAnchor(event.currentTarget)
                    }
                    onPinToggleClick={handleBulkPinToggle}
                    onArchiveToggleClick={handleBulkArchiveToggle}
                    onStatusClick={(event) =>
                      setBulkStatusAnchor(event.currentTarget)
                    }
                    onShareTextClick={() => {
                      void handleBulkShareText();
                    }}
                    onDeleteClick={() => setConfirmBulkDeleteOpen(true)}
                    onCancelClick={() => {
                      setSelectedNoteIds(new Set());
                      setSelectMode(false);
                    }}
                  />
                )}
                <Menu
                  anchorEl={bulkStatusAnchor}
                  open={Boolean(bulkStatusAnchor)}
                  onClose={() => setBulkStatusAnchor(null)}
                >
                  <MenuItem
                    onClick={() => handleBulkStatusChange(null)}
                    selected={
                      selectednoteIds.size > 0 &&
                      [...selectednoteIds].every(
                        (id) => !notes.find((item) => item.id === id)?.emoji,
                      )
                    }
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
                      <Icon path={mdiEmoticonOutline} size={0.7} />
                    </Box>
                    {statuses.length === 0
                      ? "no statuses available"
                      : "no status"}
                  </MenuItem>
                  {statuses.map((status) => (
                    <MenuItem
                      key={status.id}
                      onClick={() => handleBulkStatusChange(status.emoji)}
                    >
                      <Box
                        component="span"
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          mr: 1,
                          fontSize: "1.1rem",
                        }}
                      >
                        {status.emoji}
                      </Box>
                      <Box
                        component="span"
                        sx={getStatusTextStyle(status.format)}
                      >
                        {status.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Menu>
                <NoteList
                  notes={notes}
                  labels={labels}
                  statuses={statuses}
                  filters={noteFilters}
                  mostRecentAddedNoteId={recentlyAddednoteId}
                  mostRecentEditedNoteId={recentlyEditednoteId}
                  editingNoteId={editingNote?.id ?? null}
                  dueDaysByDate={dueCountByDay}
                  noteCountsByDay={noteCountByDay}
                  onEdit={handleEditNote}
                  onDelete={handleNoteDelete}
                  onCopy={handleNoteCopy}
                  onClone={handleCloneNote}
                  onShareLink={handleNoteShareLink}
                  onToggleBullet={handleNoteToggleBullet}
                  onAddCheckboxes={handleNoteAddCheckboxes}
                  onToggleCheckbox={handleNoteToggleCheckbox}
                  onDueChange={handleNoteDueChange}
                  onComplete={handleNoteComplete}
                  onPin={handleNotePin}
                  onArchive={handleNoteArchive}
                  onEmojiChange={handleNoteEmojiChange}
                  onInfoTips={() => setNoteStorageInfoOpen(true)}
                  availableHashtags={availableHashtags}
                  onRefreshAvailableHashtags={refreshAvailableHashtags}
                  onFilterTextChange={handleFilterTextChange}
                  onToggleHashtagFilter={handleToggleHashtagFilter}
                  onToggleHashtagInDraft={toggleHashtagInDraft}
                  onAppendHashtagToNote={handleAppendHashtagToNote}
                  onRemoveHashtagFromNote={(note, tag) => {
                    const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;
                    const nextText = note.text
                      .split("\n")
                      .map((line) =>
                        line
                          .split(/\s+/)
                          .filter((part) => part !== normalizedTag)
                          .join(" ")
                          .trim(),
                      )
                      .join("\n");
                    if (nextText !== note.text) {
                      setNotes((prev) =>
                        prev.map((existing) =>
                          existing.id === note.id
                            ? { ...existing, text: nextText }
                            : existing,
                        ),
                      );
                    }
                  }}
                  onNotify={(note) => {
                    const labelName =
                      labels.find((c) => c.id === note.labelId)?.name ??
                      "Reminder";
                    const now = Math.floor(Date.now() / 1000);
                    // mark note as having an active notification
                    setNotes((prev) =>
                      prev.map((existingNote) =>
                        existingNote.id === note.id
                          ? (() => {
                              const shouldRefreshTimestamp = isToday(
                                existingNote.createdAt,
                              );
                              const nextCreatedAt = shouldRefreshTimestamp
                                ? getUniqueCreatedAt(prev, now, existingNote.id)
                                : existingNote.createdAt;

                              return {
                                ...existingNote,
                                hasNotification: true,
                                id: String(nextCreatedAt),
                                createdAt: nextCreatedAt,
                              };
                            })()
                          : existingNote,
                      ),
                    );
                    setNotification(`${labelName}: ${note.text}`);
                    void showAppNotification(labelName, note.text).then(
                      handleNotificationResult,
                    );
                  }}
                  onLabelChange={(note, labelId) => {
                    setNotes((prev) =>
                      prev.map((existingNote) =>
                        existingNote.id === note.id
                          ? { ...existingNote, labelId }
                          : existingNote,
                      ),
                    );
                    if (editingNote?.id === note.id) {
                      seteditingNote({ ...editingNote, labelId });
                    }
                  }}
                  selectMode={selectMode}
                  selectedIds={selectednoteIds}
                  onToggleSelect={toggleNoteSelected}
                  onInstall={installPrompt ? handleInstall : undefined}
                />
              </Stack>
            </TabPanel>
            <TabPanel value={activeTab} index="labels">
              <Stack spacing={2}>
                <LabelForm
                  editingLabel={editingLabel}
                  onSubmit={handleSubmit}
                  onCancelEdit={() => setEditingLabel(null)}
                />
                <LabelList
                  labels={labels}
                  notes={notes}
                  editingLabelId={editingLabel?.id ?? null}
                  onEdit={setEditingLabel}
                  onDelete={requestDeleteLabel}
                  newlabelId={latestlabelId}
                />
              </Stack>
            </TabPanel>
            <TabPanel value={activeTab} index="statuses">
              <Stack spacing={2}>
                <StatusForm
                  editingStatus={editingStatus}
                  onSubmit={handleStatusSubmit}
                  onCancelEdit={() => setEditingStatus(null)}
                />
                <Box sx={{ pt: 1 }}>
                  <StatusList
                    statuses={statuses}
                    notes={notes}
                    editingStatusId={editingStatus?.id ?? null}
                    onEdit={setEditingStatus}
                    onDelete={handleStatusDelete}
                    newStatusId={latestStatusId}
                  />
                </Box>
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
            showRemoveButton={Boolean(draftDueDate || noteFilters.weekday)}
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
          selectedCount={selectednoteIds.size}
          onClose={() => setConfirmBulkDeleteOpen(false)}
          onConfirm={handleBulkDelete}
        />
        <ConfirmDeleteLabelDialog
          open={!!confirmDeleteLabel}
          labelName={confirmDeleteLabel?.name ?? null}
          onClose={() => setconfirmDeleteLabel(null)}
          onConfirm={() => {
            if (confirmDeleteLabel) {
              handleDelete(confirmDeleteLabel);
              setNotificationSeverity("success");
              setNotification(`Deleted label "${confirmDeleteLabel.name}"`);
            }
            setconfirmDeleteLabel(null);
          }}
        />
        <ConfirmImportDialog
          open={confirmImportOpen}
          pendingImport={pendingImport}
          source={pendingGoogleDriveImport ? "google-drive" : "json"}
          onClose={() => {
            setConfirmImportOpen(false);
            setPendingImport(null);
            setPendingGoogleDriveImport(false);
          }}
          onConfirm={confirmImport}
        />
        <BulkLabelMenu
          anchorEl={bulkLabelAnchor}
          labels={labels}
          onClose={() => setbulkLabelAnchor(null)}
          onSelect={(labelId) => {
            handleBulkLabelChange(labelId);
          }}
        />
      </Box>
    </main>
  );
}

export default App;
