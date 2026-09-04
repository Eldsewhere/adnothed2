import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Box, Paper, Snackbar, Stack } from "@mui/material";
import DueDateDialog from "./components/dialogs/DueDateDialog";
import NoteForm from "./components/NoteForm";
import NoteList from "./components/NoteList";
import HashtagBar from "./components/HashtagBar";
import WeekdayPicker from "./components/WeekdayPicker";
import DateFilterPopover from "./components/dialogs/DateFilterPopover";
import BulkLabelMenu from "./components/dialogs/LabelMenu";
import ConfirmBulkDeleteDialog from "./components/dialogs/ConfirmBulkDeleteDialog";
import ConfirmDeleteLabelDialog from "./components/dialogs/ConfirmDeleteLabelDialog";
import ConfirmImportDialog from "./components/dialogs/ConfirmImportDialog";
import ImportActionsMenu from "./components/dialogs/ImportActionsMenu";
import SelectModeActions from "./components/dialogs/SelectModeActions";
import NoteStorageInfoDialog from "./components/dialogs/NoteStorageInfoDialog";
import type {
  BeforeInstallPromptEvent,
  Label,
  LabelFormValues,
  Note,
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
  parseTextFilters,
} from "./utils/noteFilters";
import { dateRegex, formatDate, isToday } from "./utils/formatTimestamp";
import { getUniqueCreatedAt } from "./utils/noteTimestamps";
import EmojiStatusPicker from "./components/dialogs/EmojiStatusPicker";
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
  const [labels, setLabels] = useState<Label[]>([]);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
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
  const [confirmDeleteLabel, setconfirmDeleteLabel] = useState<Label | null>(
    null,
  );
  const [latestlabelId, setLatestlabelId] = useState<string | null>(null);
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    labels: Label[];
    notes: Note[];
    fileName: string;
    parseError: string | null;
  } | null>(null);
  const [pendingGoogleDriveImport, setPendingGoogleDriveImport] =
    useState(false);
  const [bulkStatusAnchor, setBulkStatusAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [importActionsAnchor, setImportActionsAnchor] =
    useState<HTMLElement | null>(null);
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
      setNotes(persistedState.notes);
      setStorageFileName(persistedState.fileName);
      if (persistedState.parseError) {
        setNotificationSeverity("error");
        setNotification(persistedState.parseError);
      }
      setStorageReady(true);
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

    savePersistedState({ labels, notes }, storageFileName);
  }, [labels, notes, storageReady, storageFileName]);

  const applyImportedState = (next: {
    labels: Label[];
    notes: Note[];
    fileName: string;
    parseError?: string | null;
  }) => {
    setLabels(next.labels);
    setNotes(next.notes);
    setStorageFileName(next.fileName);
    setStorageReady(true);
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

  const handleExportState = () => {
    const payload = serializeState({ labels, notes });
    const fileName = storageFileName.trim() || DEFAULT_FILE_NAME;
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setNotificationSeverity("success");
    setNotification(`Exported ${fileName}`);
  };

  const handleImportState = async () => {
    const fileResult = await openPersistedStateFile(storageFileName);
    if (!fileResult) {
      return;
    }
    applyImportedState(fileResult);
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

  const handleSubmit = (
    values: LabelFormValues & {
      icon: NonNullable<LabelFormValues["icon"]>;
    },
  ): boolean | void => {
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
                note.icon === prevLabel.id ? { ...note, icon: iconName } : note,
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
        note.icon === label.id ? { ...note, icon: null } : note,
      ),
    );
    if (editingLabel?.id === label.id) {
      setEditingLabel(null);
    }
    if (editingNote?.icon === label.id) {
      seteditingNote(null);
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
    const icon = values.icon === "" ? null : values.icon;
    const labelName = labels.find((c) => c.id === icon)?.name ?? "Reminder";
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
    const shouldAutoNotify =
      finalDueTimestamp === undefined ||
      (() => {
        if (finalDueTimestamp === undefined) {
          return true;
        }

        const dueDay = dayjs.unix(finalDueTimestamp).startOf("day");
        return (
          dueDay.isSame(today, "day") ||
          dueDay.isSame(today.add(1, "day"), "day")
        );
      })();

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
                icon,
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
      const time = getUniqueCreatedAt(prev);
      const id = String(time);

      setRecentlyAddedNoteId(id);
      setRecentlyEditedNoteId(null);

      return [
        ...prev,
        {
          id,
          icon,
          text: finalText,
          time,
          hasNotification: shouldAutoNotify,
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
    if (shouldAutoNotify) {
      void showAppNotification(labelName, finalText).then(
        handleNotificationResult,
      );
    }
  };

  const handleNoteCopy = (note: Note, selectedText?: string) => {
    navigator.clipboard.writeText(selectedText ?? note.text);
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
        return `${leadingWhitespace}[] ${rowWithoutBullet}`;
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
          checked ? "[]" : "[x]",
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

  const handleBulkLabelChange = (icon: string | null) => {
    setNotes((prev) =>
      prev.map((note) =>
        selectednoteIds.has(note.id) ? { ...note, icon } : note,
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
    setDraftDueDate(
      note.due !== undefined ? dayjs.unix(note.due).startOf("day") : null,
    );
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
    setDraftDueDate(
      note.due !== undefined ? dayjs.unix(note.due).startOf("day") : null,
    );
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
          ? { ...existingNote, completed: !existingNote.completed }
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

  const handleNoteToggleSpoiler = (note: Note) => {
    const nextSpoiler = !Boolean(note.spoiler);
    setNotes((prev) =>
      prev.map((existingNote) =>
        existingNote.id === note.id
          ? { ...existingNote, spoiler: nextSpoiler }
          : existingNote,
      ),
    );
    setRecentlyAddedNoteId(null);
    setRecentlyEditedNoteId(note.id);
    if (editingNote?.id === note.id) {
      seteditingNote({ ...editingNote, spoiler: nextSpoiler });
    }
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
        const escapedTag = normalizedTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const exactHashtagPattern = new RegExp(
          `(^|\\s)${escapedTag}(?=\\s|$)`,
          "gi",
        );
        const hasTag = new RegExp(`(^|\\s)${escapedTag}(?=\\s|$)`, "i").test(
          prev,
        );

        if (hasTag) {
          const nextValue = prev
            .replace(exactHashtagPattern, "$1")
            .replace(/\s{2,}/g, " ")
            .trim();

          if (editingNote !== null) {
            seteditingNote((current) =>
              current ? { ...current, text: nextValue } : current,
            );
          } else {
            handleFilterTextChange(nextValue);
          }

          return nextValue;
        }

        const trailingHashtagMatch = /#[\w-]*$/.exec(prev);

        const nextValue = trailingHashtagMatch
          ? `${prev.slice(0, trailingHashtagMatch.index)}${normalizedTag}`
          : prev.trim().length
            ? `${prev.trimEnd()} ${normalizedTag}`
            : normalizedTag;

        if (editingNote !== null) {
          seteditingNote((current) =>
            current ? { ...current, text: nextValue } : current,
          );
        } else {
          handleFilterTextChange(nextValue);
        }

        return nextValue;
      });
    },
    [editingNote, handleFilterTextChange],
  );

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
      prev.icon === value
        ? prev
        : {
            ...prev,
            icon: value,
          },
    );
  }, []);

  const handleClearLabelFilter = useCallback(() => {
    setNoteFilters((prev) => ({ ...prev, icon: "" }));
  }, []);

  const handleClearDateRangeFilter = useCallback(() => {
    setNoteFilters((prev) => ({ ...prev, date: "", endDate: "" }));
  }, []);

  const handleClearDueDateFilter = useCallback(() => {
    setNoteFilters((prev) => ({
      ...prev,
      dueDate: "",
      hasDue: false,
      weekday: null,
    }));
  }, []);

  const handleClearTextFilter = useCallback(() => {
    setDraftNoteText("");
    setNoteFilters((prev) => ({ ...prev, text: "" }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setNoteFilters(emptyNoteFilters);
    setDraftNoteText("");
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
    () => [...notes].sort((a, b) => b.time - a.time),
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

    for (const note of [...notes].sort((a, b) => b.time - a.time)) {
      for (const part of note.text.split(/\s+/)) {
        if (/^#\w[\w-]*$/.test(part)) {
          const existingCreatedAt = tagCreatedAt.get(part);
          if (
            existingCreatedAt === undefined ||
            note.time > existingCreatedAt
          ) {
            tagCreatedAt.set(part, note.time);
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

  const selectedHashtags = useMemo(() => {
    const matches = new Set<string>();

    for (const part of draftNoteText.split(/\s+/)) {
      const normalizedTag = part.trim();
      if (/^#\w[\w-]*$/.test(normalizedTag)) {
        matches.add(normalizedTag);
      }
    }

    return matches;
  }, [draftNoteText]);

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

        if (noteFilters.icon && note.icon !== noteFilters.icon) {
          return false;
        }

        return matchesTextFilters(
          note.text,
          note.time,
          index,
          sortedNotes.length,
          parsedTextFilters,
          note.due,
          note.icon,
          note.pinned,
          note.emoji,
          note.archived,
          note.completed,
        );
      }),
    [noteFilters.icon, noteFilters.hasDue, parsedTextFilters, sortedNotes],
  );

  const noteCountsByDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of calendarFilteredNotes) {
      const dayKey = formatDate(note.time);
      counts.set(dayKey, (counts.get(dayKey) ?? 0) + 1);
    }
    return counts;
  }, [calendarFilteredNotes]);

  const oldestNoteDate = useMemo(() => {
    if (notes.length === 0) {
      return dayjs().startOf("day");
    }
    const minTimestamp = Math.min(...notes.map((note) => note.time));
    return dayjs.unix(minTimestamp).startOf("day");
  }, [notes]);

  const today = useMemo(() => dayjs().startOf("day"), []);

  const filteredMinDate = useMemo(() => {
    if (calendarFilteredNotes.length === 0) {
      return oldestNoteDate;
    }
    const minTimestamp = Math.min(
      ...calendarFilteredNotes.map((note) => note.time),
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
      const key = dayjs.unix(note.time).format("YYYY-MM-DD");
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
    const nextDraftDueDate = dayjs(dayKey, "YYYY-MM-DD", true);

    if (editingNote !== null || cloneNote !== null) {
      setDraftDueDate(nextDraftDueDate.isValid() ? nextDraftDueDate : null);
      return;
    }

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

    if (editingNote === null && cloneNote === null) {
      setNoteFilters((prev) => ({
        ...prev,
        weekday: nextDueDate.format("YYYY-MM-DD"),
        date: "",
        endDate: "",
        dueDate: "",
        hasDue: false,
      }));
    }
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
    if (editingNote === null && cloneNote === null) {
      setNoteFilters((prev) => ({
        ...prev,
        weekday: null,
        date: "",
        endDate: "",
        dueDate: "",
        hasDue: false,
      }));
    }
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
      weekday: null,
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
        <Paper sx={{ px: 1, py: 0 }}>
          <NoteStorageInfoDialog
            open={noteStorageInfoOpen}
            onClose={() => setNoteStorageInfoOpen(false)}
            onNeverShowAgain={handleNeverShowInfoTipsAgain}
          />
          <Box sx={{ pt: 2 }}>
            <Stack spacing={1}>
              <NoteForm
                editingNote={editingNote}
                cloneNote={cloneNote}
                initialText={sharedText ?? undefined}
                textValue={draftNoteText}
                filterLabelId={noteFilters.icon}
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
                labelManagement={{
                  notes,
                  editingLabel,
                  onSubmit: handleSubmit,
                  onCancelEdit: () => setEditingLabel(null),
                  onEdit: setEditingLabel,
                  onDelete: requestDeleteLabel,
                  newLabelId: latestlabelId,
                }}
              />
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
                selectedHashtags={selectedHashtags}
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
                  allSelectedCompleted={
                    selectednoteIds.size > 0 &&
                    [...selectednoteIds].every((id) => {
                      const note = notes.find((item) => item.id === id);
                      return note?.completed === true;
                    })
                  }
                  onCompleteToggleClick={() => {
                    if (selectednoteIds.size === 0) {
                      return;
                    }

                    const selectedNotes = notes.filter((note) =>
                      selectednoteIds.has(note.id),
                    );
                    const shouldComplete = !selectedNotes.every(
                      (note) => note.completed,
                    );

                    setNotes((prev) =>
                      prev.map((note) =>
                        selectednoteIds.has(note.id)
                          ? { ...note, completed: shouldComplete }
                          : note,
                      ),
                    );
                  }}
                />
              )}
              <EmojiStatusPicker
                anchorEl={bulkStatusAnchor}
                onClose={() => setBulkStatusAnchor(null)}
                onEmojiChange={(_, emoji) => {
                  handleBulkStatusChange(emoji);
                  setBulkStatusAnchor(null);
                }}
                note={null}
              />
              <NoteList
                notes={notes}
                labels={labels}
                filters={noteFilters}
                hasTextFilter={Boolean(
                  draftNoteText.trim() || noteFilters.text.trim(),
                )}
                onClearTextFilter={handleClearTextFilter}
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
                onToggleSpoiler={handleNoteToggleSpoiler}
                onEmojiChange={handleNoteEmojiChange}
                onInfoTips={() => setNoteStorageInfoOpen(true)}
                onImportActionsClick={(event) =>
                  setImportActionsAnchor(event.currentTarget)
                }
                availableHashtags={availableHashtags}
                onRefreshAvailableHashtags={refreshAvailableHashtags}
                onFilterTextChange={handleFilterTextChange}
                onToggleHashtagInDraft={toggleHashtagInDraft}
                onAppendHashtagToNote={handleAppendHashtagToNote}
                labelManagement={{
                  notes,
                  editingLabel,
                  onSubmit: handleSubmit,
                  onCancelEdit: () => setEditingLabel(null),
                  onEdit: setEditingLabel,
                  onDelete: requestDeleteLabel,
                  newLabelId: latestlabelId,
                }}
                onClearLabelFilter={handleClearLabelFilter}
                onClearDateRangeFilter={handleClearDateRangeFilter}
                onClearDueDateFilter={handleClearDueDateFilter}
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
                    labels.find((c) => c.id === note.icon)?.name ?? "Reminder";
                  const now = Math.floor(Date.now() / 1000);
                  // mark note as having an active notification
                  setNotes((prev) =>
                    prev.map((existingNote) =>
                      existingNote.id === note.id
                        ? (() => {
                            const shouldRefreshTimestamp = isToday(
                              existingNote.time,
                            );
                            const nextCreatedAt = shouldRefreshTimestamp
                              ? getUniqueCreatedAt(prev, now, existingNote.id)
                              : existingNote.time;

                            return {
                              ...existingNote,
                              hasNotification: true,
                              id: String(nextCreatedAt),
                              time: nextCreatedAt,
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
                onLabelChange={(note, icon) => {
                  setNotes((prev) =>
                    prev.map((existingNote) =>
                      existingNote.id === note.id
                        ? { ...existingNote, icon }
                        : existingNote,
                    ),
                  );
                  if (editingNote?.id === note.id) {
                    seteditingNote({ ...editingNote, icon });
                  }
                }}
                selectMode={selectMode}
                selectedIds={selectednoteIds}
                onToggleSelect={toggleNoteSelected}
                onToggleSelectMode={toggleSelectMode}
                onOpenDateFilter={(event) => {
                  setPendingDateFilter({
                    date: noteFilters.date,
                    endDate: noteFilters.endDate,
                  });
                  setDatePickerMode("start");
                  setDatePopoverAnchor(event.currentTarget);
                }}
                hasDateFilter={Boolean(
                  noteFilters.date ||
                  noteFilters.endDate ||
                  noteFilters.dueDate ||
                  noteFilters.hasDue ||
                  noteFilters.weekday !== null,
                )}
                onInstall={installPrompt ? handleInstall : undefined}
              />
            </Stack>
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
            title="Schedule note"
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
          onSelect={(icon) => {
            handleBulkLabelChange(icon);
          }}
        />
        <ImportActionsMenu
          anchorEl={importActionsAnchor}
          onClose={() => setImportActionsAnchor(null)}
          onImport={() => {
            setImportActionsAnchor(null);
            void handleImportState();
          }}
          onImportFromGoogleDrive={() => {
            setImportActionsAnchor(null);
            void handleImportFromGoogleDrive();
          }}
          onExport={() => {
            setImportActionsAnchor(null);
            handleExportState();
          }}
          labels={labels}
          notes={notes}
          onNotify={(severity, message) => {
            setNotificationSeverity(severity);
            setNotification(message);
          }}
        />
      </Box>
    </main>
  );
}

export default App;
