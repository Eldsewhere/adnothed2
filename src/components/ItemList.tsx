import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  Box,
  Checkbox,
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Select,
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
  mdiCalendarPlus,
  mdiCancel,
  mdiCheckboxMarked,
  mdiCheckCircle,
  mdiChevronDown,
  mdiClose,
  mdiContentCopy,
  mdiDotsVertical,
  mdiFormatListBulleted,
  mdiLink,
  mdiMagnify,
  mdiNoteText,
  mdiPencil,
  mdiPin,
  mdiPinOff,
  mdiShareVariant,
  mdiTrashCan,
} from "@mdi/js";
import type { Category, Item, ItemFilters as ItemFiltersValue } from "../types";
import {
  dateRegex,
  formatDate,
  formatDueDate,
  formatTimestamp,
  isToday,
} from "../utils/formatTimestamp";
import {
  matchesTextFilters,
  NO_CATEGORY_FILTER_VALUE,
  parseTextFilters,
} from "../utils/itemFilters";
import { splitTextByUrls } from "../utils/textPatterns";
import dayjs, { type Dayjs } from "dayjs";
import { DateCalendar } from "@mui/x-date-pickers";
import LabelIcon from "./LabelIcon";

type ItemListProps = {
  items: Item[];
  categories: Category[];
  filters: ItemFiltersValue;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onCopy: (item: Item) => void;
  onShareLink: (item: Item) => void;
  onToggleBullet: (item: Item) => void;
  onAddCheckboxes: (item: Item) => void;
  onToggleCheckbox: (item: Item, rowIndex: number) => void;
  onNotify: (item: Item) => void;
  onCategoryChange: (item: Item, categoryId: string | null) => void;
  onDueChange: (item: Item, due: number | null) => void;
  onPin: (item: Item) => void;
  selectMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onInstall?: () => void;
};

const ROW_HEIGHT = 80;
const OVERSCAN = 6;
const BULLET_PREFIX = "• ";
const CHECKBOX_ROW_PATTERN = /^(\[ ?([xX])? ?\])\s?(.*)$/;

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

const ItemList = ({
  items,
  categories,
  filters,
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
}: ItemListProps) => {
  const [menuAnchor, setMenuAnchor] = useState<{
    el: HTMLElement;
    item: Item;
  } | null>(null);
  const [overflowModalItemId, setOverflowModalItemId] = useState<string | null>(
    null,
  );
  const [formatMenuAnchor, setFormatMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [formatMenuItem, setFormatMenuItem] = useState<Item | null>(null);
  const [overflowingItemIds, setOverflowingItemIds] = useState<Set<string>>(
    new Set(),
  );
  const [categoryMenuAnchor, setCategoryMenuAnchor] = useState<{
    el: HTMLElement;
    item: Item;
  } | null>(null);
  const [dueDateDialogItem, setDueDateDialogItem] = useState<Item | null>(null);
  const [dueDateValue, setDueDateValue] = useState<Dayjs | null>(null);
  const [dueHour12, setDueHour12] = useState<number>(12);
  const [dueAmPm, setDueAmPm] = useState<"AM" | "PM">("AM");
  const [dueMinute, setDueMinute] = useState<0 | 15 | 30 | 45>(0);
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

  const sortedItems = useMemo(() => {
    const todayUnix = today.unix();
    const dayAfterTomorrowUnix = today.add(2, "day").unix();
    return [...items].sort((a, b) => {
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
  }, [items, today]);
  const overflowModalItem = useMemo(
    () => items.find((item) => item.id === overflowModalItemId) ?? null,
    [items, overflowModalItemId],
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
    setOverflowModalItemId(null);
  };

  const handleEdit = (item: Item) => {
    onEdit(item);
    closeMenu();
  };

  const handleDelete = (item: Item) => {
    onDelete(item);
    closeMenu();
  };

  const handleCopy = (item: Item) => {
    onCopy(item);
    closeMenu();
  };

  const handleNotify = (item: Item) => {
    onNotify(item);
    closeMenu();
  };

  const handleToggleBullet = (item: Item) => {
    onToggleBullet(item);
    closeMenu();
  };

  const handleSearchGoogle = (item: Item) => {
    window.open(
      `https://www.google.com/search?q=${encodeURIComponent(item.text)}`,
      "_blank",
      "noopener,noreferrer",
    );
    closeMenu();
  };

  const handleShare = async (item: Item) => {
    closeMenu();
    if (navigator.share) {
      await navigator.share({ text: item.text });
    } else {
      await navigator.clipboard.writeText(item.text);
    }
  };

  const handleShareLink = (item: Item) => {
    onShareLink(item);
    closeMenu();
  };

  const updateOverflowState = (itemId: string, element: HTMLElement | null) => {
    if (!element) return;
    const isOverflowing =
      element.scrollWidth > element.clientWidth ||
      element.scrollHeight > element.clientHeight;
    setOverflowingItemIds((currentIds) => {
      if (currentIds.has(itemId) === isOverflowing) return currentIds;
      const nextIds = new Set(currentIds);
      if (isOverflowing) {
        nextIds.add(itemId);
      } else {
        nextIds.delete(itemId);
      }
      return nextIds;
    });
  };

  const openCategoryMenu = (event: MouseEvent<HTMLElement>, item: Item) => {
    setCategoryMenuAnchor({ el: event.currentTarget, item });
  };

  const closeCategoryMenu = () => setCategoryMenuAnchor(null);

  const openDueDateDialog = (item: Item) => {
    setDueDateDialogItem(item);
    if (item.due) {
      const d = dayjs.unix(item.due);
      setDueDateValue(d.startOf("day"));
      const h24 = d.hour();
      const rawMinute = d.minute();
      const roundedMinute = ([0, 15, 30, 45] as const).reduce((prev, curr) =>
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
    if (!dueDateDialogItem || !dueDateValue) return;
    const h24 =
      dueAmPm === "AM"
        ? dueHour12 === 12
          ? 0
          : dueHour12
        : dueHour12 === 12
          ? 12
          : dueHour12 + 12;
    const combined = dueDateValue.hour(h24).minute(dueMinute).second(0);
    onDueChange(dueDateDialogItem, combined.unix());
    setDueDateDialogItem(null);
  };

  const handleAddToGoogleCalendar = () => {
    if (!dueDateDialogItem || !dueDateValue) return;
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
      text: dueDateDialogItem.text,
      dates: `${formatGoogleDate(start)}/${formatGoogleDate(end)}`,
      ctz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    window.open(
      `https://calendar.google.com/calendar/render?${params.toString()}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleCategorySelect = (categoryId: string | null) => {
    if (!categoryMenuAnchor) {
      return;
    }
    onCategoryChange(categoryMenuAnchor.item, categoryId);
    closeCategoryMenu();
  };

  const activeFilterCount = [
    filters.categoryId !== "",
    filters.text !== "",
    filters.date !== "",
    filters.endDate !== "",
    filters.dueDate !== "",
    filters.hasDue,
  ].filter(Boolean).length;

  const parsedTextFilters = useMemo(
    () => parseTextFilters(filters.text),
    [filters.text],
  );

  const filteredItems = useMemo(
    () =>
      sortedItems.filter((item, index) => {
        if (filters.categoryId === NO_CATEGORY_FILTER_VALUE) {
          if (item.categoryId !== null) {
            return false;
          }
        } else if (
          filters.categoryId &&
          item.categoryId !== filters.categoryId
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
          )
        ) {
          return false;
        }
        const itemDate = formatDate(item.createdAt);
        const hasStartDate =
          filters.date.length === 10 && dateRegex.test(filters.date);
        const hasEndDate =
          filters.endDate.length === 10 && dateRegex.test(filters.endDate);

        if (hasStartDate && itemDate < filters.date.trim()) {
          return false;
        }
        if (hasEndDate && itemDate > filters.endDate.trim()) {
          return false;
        }
        if (filters.dueDate) {
          if (!item.due || formatDate(item.due) !== filters.dueDate) {
            return false;
          }
        }
        if (filters.hasDue) {
          const todayUnix = dayjs().startOf("day").unix();
          if (item.due === undefined || item.due < todayUnix) {
            return false;
          }
        }
        return true;
      }),
    [sortedItems, filters, parsedTextFilters],
  );

  const dayIndexByDate = useMemo(() => {
    const map = new Map<string, number>();
    const dates = [
      ...new Set(filteredItems.map((item) => formatDate(item.createdAt))),
    ];
    dates.sort((a, b) => b.localeCompare(a));
    dates.forEach((date, index) => map.set(date, index));
    return map;
  }, [filteredItems]);

  const totalHeight = filteredItems.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    filteredItems.length,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN,
  );
  const visibleItems = filteredItems.slice(startIndex, endIndex);

  return (
    <Box>
      {filteredItems.length === 0 ? (
        <Alert severity="info" sx={{ textAlign: "left" }}>
          {sortedItems.length === 0 ? (
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
            height: "calc(100vh - 180px)",
            minHeight: 200,
            overflowY: "auto",
            position: "relative",
          }}
        >
          <Box sx={{ height: totalHeight, position: "relative" }}>
            {visibleItems.map((item, i) => {
              const index = startIndex + i;
              const category = item.categoryId
                ? categoriesById.get(item.categoryId)
                : undefined;
              const dayIndex =
                dayIndexByDate.get(formatDate(item.createdAt)) ?? 0;
              return (
                <Box
                  key={item.id}
                  sx={{
                    position: "absolute",
                    top: index * ROW_HEIGHT,
                    left: 0,
                    right: 0,
                    height: ROW_HEIGHT,
                    display: "flex",
                    alignItems: "center",
                    borderBottom: "1px solid",
                    paddingX: 1,
                    borderColor: colors.blueGrey[700],
                    overflow: "hidden",
                    bgcolor:
                      item.pinned ||
                      (item.due !== undefined && isToday(item.due))
                        ? "#414d4b"
                        : dayIndex % 2 === 0
                          ? colors.blueGrey[900]
                          : colors.blueGrey[800],
                  }}
                >
                  {selectMode && (
                    <Checkbox
                      size="small"
                      checked={selectedIds.has(item.id)}
                      onChange={() => onToggleSelect(item.id)}
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
                        aria-label={`Change label for ${item.text}`}
                        size="small"
                        onClick={(event: MouseEvent<HTMLElement>) =>
                          openCategoryMenu(event, item)
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
                          <Icon path={mdiNoteText} size={0.8} />
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
                        ref={(element) => updateOverflowState(item.id, element)}
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          textAlign: "left",
                          whiteSpace: "pre-wrap",
                          overflow: "hidden",
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {item.text.split("\n").map((row, rowIndex) => {
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
                                  checked={isChecked}
                                  onChange={() =>
                                    onToggleCheckbox(item, rowIndex)
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
                              {rowIndex < item.text.split("\n").length - 1 && (
                                <br />
                              )}
                            </Box>
                          );
                        })}
                      </Typography>
                      {overflowingItemIds.has(item.id) && (
                        <Tooltip title="Expand note" arrow>
                          <IconButton
                            aria-label={`Expand ${item.text}`}
                            size="small"
                            onClick={() => setOverflowModalItemId(item.id)}
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
                              isToday(item.createdAt) ||
                              item.pinned ||
                              (item.due !== undefined && isToday(item.due)) || item.hasNotification
                                ? colors.lightGreen[400]
                                : colors.blueGrey[300],
                          }}
                        >
                          {formatTimestamp(item.createdAt)}
                          {item.hasNotification && (
                            <Tooltip title="Notified" arrow>
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
                          {item.pinned && (
                            <Tooltip title="Pinned" arrow>
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
                        {selectMode || activeFilterCount > 0 ? (
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
                            {sortedItems.length -
                              sortedItems.findIndex(
                                (currenItem) => currenItem.id === item.id,
                              )}
                          </Typography>
                        ) : item.due !== undefined &&
                          item.due >= today.unix() ? (
                          <Typography
                            variant="caption"
                            sx={{
                              textAlign: "right",
                              display: "block",
                              color: colors.orange[300],
                            }}
                          >
                            {formatDueDate(item.due)}
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
                        aria-label={`Actions for ${item.text}`}
                        size="small"
                        onClick={(event: MouseEvent<HTMLElement>) =>
                          setMenuAnchor({ el: event.currentTarget, item })
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
        <MenuItem onClick={() => menuAnchor && handleNotify(menuAnchor.item)}>
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
              onPin(menuAnchor.item);
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
              path={menuAnchor?.item.pinned ? mdiPinOff : mdiPin}
              size={0.7}
            />
          </Box>
          {menuAnchor?.item.pinned ? "Unpin" : "Pin"}
        </MenuItem>
        <Divider sx={{ m: `0 !important` }} />
        <MenuItem onClick={() => menuAnchor && handleCopy(menuAnchor.item)}>
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
        <MenuItem onClick={() => menuAnchor && handleShare(menuAnchor.item)}>
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
        <MenuItem
          onClick={() => menuAnchor && handleSearchGoogle(menuAnchor.item)}
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
          Google
        </MenuItem>
        <MenuItem
          onClick={() => menuAnchor && handleShareLink(menuAnchor.item)}
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
        <Divider sx={{ m: `0 !important` }} />
        <MenuItem
          onClick={() => {
            if (menuAnchor) {
              openDueDateDialog(menuAnchor.item);
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
                setFormatMenuItem(menuAnchor.item);
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
        <MenuItem onClick={() => menuAnchor && handleEdit(menuAnchor.item)}>
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
        <MenuItem onClick={() => menuAnchor && handleDelete(menuAnchor.item)}>
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
            <Icon path={mdiTrashCan} size={0.7} />
          </Box>
          Delete
        </MenuItem>
      </Menu>
      {overflowModalItem && (
        <Dialog
          open
          onClose={() => setOverflowModalItemId(null)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle sx={{ bgcolor: colors.blueGrey[900], p: 1 }}>
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
                    (category) => category.id === overflowModalItem?.categoryId,
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
                        <Icon path={mdiNoteText} size={0.8} />
                      )}
                      {category ? category.name : "No label"}
                    </Box>
                  );
                })()}
              </Typography>
              <IconButton
                aria-label="Close note dialog"
                size="small"
                onClick={() => setOverflowModalItemId(null)}
                sx={{ color: colors.blueGrey[100] }}
              >
                <Icon path={mdiClose} size={0.8} />
              </IconButton>
            </Box>
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
              {overflowModalItem.text.split("\n").map((row, rowIndex) => {
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
                        checked={isChecked}
                        onChange={() =>
                          onToggleCheckbox(overflowModalItem, rowIndex)
                        }
                        size="small"
                        sx={{ p: 0.25, mr: 0.5, mt: 0.1 }}
                      />
                    )}
                    <Typography
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
            <Button
              variant="contained"
              startIcon={<Icon path={mdiDotsVertical} size={0.7} />}
              onClick={(event) =>
                setMenuAnchor({
                  el: event.currentTarget,
                  item: overflowModalItem,
                })
              }
            >
              Options
            </Button>
          </DialogActions>
        </Dialog>
      )}
      <Menu
        anchorEl={formatMenuAnchor}
        open={Boolean(formatMenuAnchor && formatMenuItem)}
        onClose={() => {
          setFormatMenuAnchor(null);
          setFormatMenuItem(null);
        }}
      >
        {formatMenuItem && (
          <>
            <MenuItem
              onClick={() => {
                handleToggleBullet(formatMenuItem);
                setFormatMenuAnchor(null);
                setFormatMenuItem(null);
              }}
            >
              <Box
                component="span"
                sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
              >
                <Icon path={mdiFormatListBulleted} size={0.7} />
              </Box>
              {allNonEmptyRowsBulleted(formatMenuItem.text)
                ? "Del bullets"
                : "Add bullets"}
            </MenuItem>
            <MenuItem
              onClick={() => {
                onAddCheckboxes(formatMenuItem);
                setFormatMenuAnchor(null);
                setFormatMenuItem(null);
              }}
            >
              <Box
                component="span"
                sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
              >
                <Icon path={mdiCheckboxMarked} size={0.7} />
              </Box>
              {allNonEmptyRowsCheckboxes(formatMenuItem.text)
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
          autoFocus={categoryMenuAnchor?.item.categoryId === null}
          selected={categoryMenuAnchor?.item.categoryId === null}
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
            <Icon path={mdiNoteText} size={0.7} />
          </Box>
          {categories.length == 0 ? "No labels available" : "No label"}
        </MenuItem>
        {categories.map((category) => (
          <MenuItem
            key={category.id}
            autoFocus={categoryMenuAnchor?.item.categoryId === category.id}
            selected={categoryMenuAnchor?.item.categoryId === category.id}
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
      {dueDateDialogItem && (
        <Dialog
          open
          onClose={() => setDueDateDialogItem(null)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: colors.blueGrey[900], p: 1.5 }}>
            Set due date
          </DialogTitle>
          <DialogContent sx={{ bgcolor: colors.blueGrey[800], p: 0, pb: 1 }}>
            <DateCalendar
              value={dueDateValue}
              onChange={(value: Dayjs | null) => setDueDateValue(value)}
              minDate={today}
              maxDate={endOfNextMonth}
              sx={{
                width: "100%",
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
                "& .MuiPickersDay-root": {
                  color: colors.blueGrey[100],
                },
                "& .MuiPickersDay-root.Mui-selected": {
                  backgroundColor: colors.blue[700],
                },
                "& .MuiPickersDay-root:not(.Mui-selected):hover": {
                  backgroundColor: "rgba(96,125,139,0.28)",
                },
                "& .MuiPickersDay-root.MuiPickersDay-today:not(.Mui-selected)":
                  {
                    borderColor: colors.blueGrey[400],
                  },
              }}
            />
            <Stack
              direction="row"
              spacing={1}
              sx={{ px: 2, pb: 1, alignItems: "center" }}
            >
              <FormControl size="small" sx={{ width: 72 }}>
                <InputLabel>Hour</InputLabel>
                <Select
                  label="Hour"
                  value={dueHour12}
                  onChange={(e) =>
                    setDueHour12(Number(e.target.value) as number)
                  }
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                    <MenuItem key={h} value={h}>
                      {h}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ width: 80 }}>
                <InputLabel>AM/PM</InputLabel>
                <Select
                  label="AM/PM"
                  value={dueAmPm}
                  onChange={(e) => setDueAmPm(e.target.value as "AM" | "PM")}
                >
                  <MenuItem value="AM">AM</MenuItem>
                  <MenuItem value="PM">PM</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ width: 80 }}>
                <InputLabel>Min</InputLabel>
                <Select
                  label="Min"
                  value={dueMinute}
                  onChange={(e) =>
                    setDueMinute(Number(e.target.value) as 0 | 15 | 30 | 45)
                  }
                >
                  {([0, 15, 30, 45] as const).map((m) => (
                    <MenuItem key={m} value={m}>
                      {String(m).padStart(2, "0")}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ bgcolor: colors.blueGrey[900], p: 1 }}>
            {dueDateDialogItem.due !== undefined && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Icon path={mdiTrashCan} size={0.75} />}
                onClick={() => {
                  onDueChange(dueDateDialogItem, null);
                  setDueDateDialogItem(null);
                }}
              >
                Remove
              </Button>
            )}
            <Button
              variant="outlined"
              color="warning"
              startIcon={<Icon path={mdiCalendarPlus} size={0.75} />}
              onClick={handleAddToGoogleCalendar}
              disabled={!dueDateValue}
            >
              +Google
            </Button>
            <Box sx={{ flex: 1 }} />
            <IconButton
              aria-label="Cancel due date"
              color={"primary"}
              onClick={() => setDueDateDialogItem(null)}
            >
              <Icon path={mdiCancel} size={0.9} />
            </IconButton>
            <IconButton
              aria-label="Save due date"
              onClick={handleSaveDueDate}
              color={"primary"}
              sx={{ color: colors.lightGreen[400] }}
            >
              <Icon path={mdiCheckCircle} size={0.9} />
            </IconButton>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default ItemList;
