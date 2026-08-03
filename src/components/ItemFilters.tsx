import { useMemo, useState, type MouseEvent } from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  colors,
  FormControlLabel,
  IconButton,
  MenuItem,
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
import { mdiFilterOutline, mdiNoteText } from "@mdi/js";
import type { Category, Item, ItemFilters as ItemFiltersValue } from "../types";
import {
  emptyItemFilters,
  NO_CATEGORY_FILTER_VALUE,
} from "../utils/itemFilters";
import { dateRegex, formatDate } from "../utils/formatTimestamp";
import { containsUrl, isOnlyNumbers } from "../utils/textPatterns";

type ItemFiltersProps = {
  categories: Category[];
  items: Item[];
  filters: ItemFiltersValue;
  onChange: (filters: ItemFiltersValue) => void;
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

const ItemFilters = ({
  categories,
  items,
  filters,
  onChange,
}: ItemFiltersProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => b.createdAt - a.createdAt),
    [items],
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
          filters.text &&
          !item.text.toLowerCase().includes(filters.text.toLowerCase())
        ) {
          return false;
        }

        if (filters.hasUrl && !containsUrl(item.text)) {
          return false;
        }

        if (filters.hasNumber && !isOnlyNumbers(item.text)) {
          return false;
        }

        if (filters.indexAt) {
          return index === sortedItems.length - Number(filters.indexAt);
        }

        return true;
      }),
    [filters, sortedItems],
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
          filters.text &&
          !item.text.toLowerCase().includes(filters.text.toLowerCase())
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

        if (filters.hasUrl && !containsUrl(item.text)) {
          return false;
        }

        if (filters.hasNumber && !isOnlyNumbers(item.text)) {
          return false;
        }

        if (filters.indexAt) {
          return index === sortedItems.length - Number(filters.indexAt);
        }

        return true;
      }).length,
    [filters, sortedItems],
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

  const selectedCategory = categories.find(
    (category) => category.id === filters.categoryId,
  );
  const buttonIconPath = selectedCategory
    ? selectedCategory.icon.path
    : mdiFilterOutline;

  const activeFilterCount = [
    filters.categoryId !== "",
    filters.text !== "",
    filters.date !== "",
    filters.endDate !== "",
    filters.hasUrl,
    filters.hasNumber,
    filters.indexAt !== "",
  ].filter(Boolean).length;

  const handleOpen = (event: MouseEvent<HTMLButtonElement>) =>
    setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const filtersActive = Boolean(anchorEl) || activeFilterCount > 0;

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
      <Tooltip
        title={`Open filters ${activeFilterCount ? ` (${activeFilterCount} active)` : ""}`}
      >
        <IconButton
          aria-label="Filter notes"
          onClick={handleOpen}
          color={filtersActive ? "primary" : "default"}
        >
          {
            <Badge
              badgeContent={
                activeFilterCount &&
                !(activeFilterCount === 1 && filters.categoryId !== "")
                  ? activeFilterCount
                  : null
              }
              color="primary"
            >
              <Icon path={buttonIconPath} size={0.9} />
            </Badge>
          }
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
            },
          },
        }}
      >
        <Box sx={{ p: 1, width: 220 }}>
          <Typography
            variant="body1"
            gutterBottom
            sx={{ mb: 2, color: colors.blueGrey[100] }}
          >
            {`Filtered notes: ${fullyFilteredItemsCount}`}
          </Typography>
          <Stack spacing={2}>
            <TextField
              select
              label="Label"
              size="small"
              value={filters.categoryId}
              onChange={(event) =>
                onChange({ ...filters, categoryId: event.target.value })
              }
            >
              <MenuItem value="">Show all</MenuItem>
              <MenuItem
                value={NO_CATEGORY_FILTER_VALUE}
                sx={{ color: colors.blueGrey[300] }}
              >
                <Box
                  component="span"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <Icon path={mdiNoteText} size={0.7} />
                  {` No label`}
                </Box>
              </MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  <Box
                    component="span"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Icon path={category.icon.path} size={0.7} />
                    {` ${category.name}`}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Note contains"
              size="small"
              value={filters.text}
              onChange={(event) =>
                onChange({ ...filters, text: event.target.value })
              }
            />
            <TextField
              label="Note Index"
              size="small"
              type="number"
              value={filters.indexAt}
              onChange={(event) =>
                onChange({ ...filters, indexAt: event.target.value })
              }
            />
            <DatePicker
              label="Start date"
              value={startDateValue}
              showDaysOutsideCurrentMonth
              minDate={filteredMinDate}
              maxDate={filteredMaxDate}
              onChange={(value: Dayjs | null) => {
                const nextStart = value ? value.format("YYYY-MM-DD") : "";
                onChange({ ...filters, date: nextStart, endDate: nextStart });
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
            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.hasUrl}
                    onChange={(event) =>
                      onChange({ ...filters, hasUrl: event.target.checked })
                    }
                  />
                }
                label="With URLs"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.hasNumber}
                    onChange={(event) =>
                      onChange({ ...filters, hasNumber: event.target.checked })
                    }
                  />
                }
                label="Only numbers"
              />
            </Stack>
            <Tooltip
              title={
                activeFilterCount === 0
                  ? "No filters to clear"
                  : "Clear filters"
              }
            >
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={activeFilterCount === 0}
                  onClick={() => onChange(emptyItemFilters)}
                >
                  Clear filters
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Box>
      </Popover>
    </>
  );
};

export default ItemFilters;
