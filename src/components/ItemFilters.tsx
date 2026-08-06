import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  Badge,
  Box,
  Button,
  colors,
  DialogTitle,
  IconButton,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import dayjs, { type Dayjs } from "dayjs";
import { DatePicker } from "@mui/x-date-pickers";
import { PickerDay, type PickerDayProps } from "@mui/x-date-pickers/PickerDay";
import { Icon } from "@mdi/react";
import { mdiClose, mdiFilter } from "@mdi/js";
import type { Item, ItemFilters as ItemFiltersValue } from "../types";
import {
  emptyItemFilters,
  matchesTextFilters,
  NO_CATEGORY_FILTER_VALUE,
  parseTextFilters,
} from "../utils/itemFilters";
import { dateRegex, formatDate } from "../utils/formatTimestamp";

type ItemFiltersProps = {
  items: Item[];
  filters: ItemFiltersValue;
  onChange: (filters: ItemFiltersValue) => void;
  selectMode: boolean;
};

type NoteDayProps = PickerDayProps & {
  noteCountsByDay: Map<string, number>;
};

const NoteDay = ({
  day,
  noteCountsByDay,
  outsideCurrentMonth,
  ...other
}: NoteDayProps) => {
  const key = dayjs(day).format("YYYY-MM-DD");
  const noteCount = noteCountsByDay.get(key) ?? 0;
  const hasNotes = noteCount > 0;
  const isOutside = Boolean(outsideCurrentMonth);
  const isFuture = dayjs(day).isAfter(dayjs(), "day");

  return (
    <Badge
      overlap="circular"
      badgeContent={noteCount}
      color="success"
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
          "&.Mui-disabled": {
            color: colors.blueGrey[600],
            borderColor: "transparent",
            backgroundColor: "rgba(96, 125, 139, 0.06)",
            opacity: 0.5,
          },
          ...(isFuture
            ? {
                color: colors.blueGrey[600],
                borderColor: "transparent",
                backgroundColor: "rgba(96, 125, 139, 0.06)",
                opacity: 0.5,
              }
            : {}),
          ...(hasNotes
            ? {
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
        }}
      />
    </Badge>
  );
};

export type ItemFiltersHandle = {
  openWithCalendar: (anchor: HTMLButtonElement | null) => void;
};

const ItemFilters = forwardRef<ItemFiltersHandle, ItemFiltersProps>(
  function ItemFilters({ items, filters, onChange, selectMode }, ref) {
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [dateAnchorEl, setDateAnchorEl] = useState<HTMLButtonElement | null>(
      null,
    );
    const [startDateOpen, setStartDateOpen] = useState(false);
    const filterButtonRef = useRef<HTMLButtonElement>(null);

    useImperativeHandle(ref, () => ({
      openWithCalendar(anchor) {
        setDateAnchorEl(anchor ?? null);
        setStartDateOpen(true);
      },
    }));

    const sortedItems = useMemo(
      () => [...items].sort((a, b) => b.createdAt - a.createdAt),
      [items],
    );

    const parsedTextFilters = useMemo(
      () => parseTextFilters(filters.text),
      [filters.text],
    );

    const calendarFilteredItems = useMemo(
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

          return true;
        }),
      [filters, parsedTextFilters, sortedItems],
    );

    const fullyFilteredItemsCount = useMemo(
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

          return true;
        }).length,
      [filters, parsedTextFilters, sortedItems],
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

    const startDateValue =
      filters.date && dateRegex.test(filters.date) && filters.date.length === 10
        ? dayjs(filters.date)
        : null;

    const endDateValue =
      filters.endDate &&
      dateRegex.test(filters.endDate) &&
      filters.endDate.length === 10
        ? dayjs(filters.endDate)
        : null;

    const activeFilterCount = [
      filters.categoryId !== "",
      filters.text !== "",
      filters.date !== "",
      filters.endDate !== "",
    ].filter(Boolean).length;

    const handleOpen = (event: MouseEvent<HTMLButtonElement>) =>
      setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);

    const CalendarDay = (props: PickerDayProps) => (
      <NoteDay {...props} noteCountsByDay={noteCountsByDay} />
    );

    const calendarSlotProps = {
      textField: { size: "small" as const },
      popper: {
        sx: {
          "& .MuiPaper-root": {
            backgroundColor: colors.grey[900],
            border: `1px solid ${colors.blueGrey[700]}`,
          },
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
        },
      },
    };

    return (
      <>
        <Tooltip title={`Filter note text`}>
          <IconButton
            ref={filterButtonRef}
            aria-label="Filter notes"
            onClick={handleOpen}
            color={filters.text.trim() ? "primary" : "default"}
            disabled={items.length === 0 || selectMode}
          >
            <Icon path={mdiFilter} size={0.9} />
          </IconButton>
        </Tooltip>
        <Popover
          open={!!anchorEl}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{
            paper: {
              sx: {
                backgroundColor: colors.blueGrey[900],
                border: `1px solid ${colors.blueGrey[700]}`,
                width: 200,
              },
            },
          }}
        >
          <DialogTitle
            sx={{
              py: 1,
              px: 2,
              borderBottom: `1px solid ${colors.blueGrey[700]}`,
              color: colors.blueGrey[100],
              backgroundColor: colors.blueGrey[900],
            }}
          >
            <Stack
              direction="row"
              sx={{ alignItems: "center", justifyContent: "space-between" }}
            >
              <Typography variant="subtitle1">Filters</Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography
                  variant="caption"
                  sx={{ color: colors.blueGrey[300] }}
                >
                  {fullyFilteredItemsCount}
                </Typography>
                <IconButton
                  size="small"
                  aria-label="Close filters"
                  onClick={handleClose}
                  sx={{ color: colors.blueGrey[100], p: 0.5 }}
                >
                  <Icon path={mdiClose} size={0.75} />
                </IconButton>
              </Stack>
            </Stack>
          </DialogTitle>
          <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
              <TextField
                label="Note contains"
                size="small"
                value={filters.text}
                onChange={(event) =>
                  onChange({ ...filters, text: event.target.value })
                }
                helperText="Use / commands ending with ; like /index:3; /with:url; /minLength:20;"
              />
              <Tooltip
                title={
                  activeFilterCount === 0
                    ? "No filters to clear"
                    : "Clear filters"
                }
              >
                <Button
                  size="small"
                  variant="contained"
                  disabled={activeFilterCount === 0}
                  onClick={() => {
                    onChange(emptyItemFilters);
                    handleClose();
                  }}
                >
                  Clear filters
                </Button>
              </Tooltip>
            </Stack>
          </Box>
        </Popover>
        <Popover
          open={Boolean(dateAnchorEl)}
          anchorEl={dateAnchorEl}
          onClose={() => {
            setDateAnchorEl(null);
            setStartDateOpen(false);
          }}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{
            paper: {
              sx: {
                backgroundColor: colors.blueGrey[900],
                border: `1px solid ${colors.blueGrey[700]}`,
                width: 260,
                p: 2,
              },
            },
          }}
        >
          <Stack spacing={2}>
            <DatePicker
              label="Start date"
              value={startDateValue}
              open={startDateOpen}
              onOpen={() => setStartDateOpen(true)}
              onClose={() => setStartDateOpen(false)}
              showDaysOutsideCurrentMonth
              minDate={filteredMinDate}
              maxDate={filteredMaxDate}
              onChange={(value: Dayjs | null) => {
                const nextStart = value ? value.format("YYYY-MM-DD") : "";
                onChange({ ...filters, date: nextStart, endDate: nextStart });
                setStartDateOpen(false);
              }}
              slots={{ day: CalendarDay }}
              slotProps={calendarSlotProps}
              format="YYYY-MM-DD"
            />
            <DatePicker
              label="End date"
              value={endDateValue}
              showDaysOutsideCurrentMonth
              minDate={startDateValue ?? filteredMinDate}
              maxDate={filteredMaxDate}
              onChange={(value: Dayjs | null) =>
                onChange({
                  ...filters,
                  endDate: value ? value.format("YYYY-MM-DD") : "",
                })
              }
              slots={{ day: CalendarDay }}
              slotProps={calendarSlotProps}
              format="YYYY-MM-DD"
            />
            <Button
              size="small"
              variant="contained"
              disabled={!filters.date && !filters.endDate}
              onClick={() => onChange({ ...filters, date: "", endDate: "" })}
            >
              Clear date filter
            </Button>
          </Stack>
        </Popover>
      </>
    );
  },
);

export default ItemFilters;
