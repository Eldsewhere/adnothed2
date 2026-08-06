import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Badge,
  Box,
  colors,
  IconButton,
  Popover,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import dayjs, { type Dayjs } from "dayjs";
import { StaticDatePicker } from "@mui/x-date-pickers";
import { PickerDay, type PickerDayProps } from "@mui/x-date-pickers/PickerDay";
import { Icon } from "@mdi/react";
import { mdiFilter } from "@mdi/js";
import type { Item, ItemFilters as ItemFiltersValue } from "../types";
import {
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
  isTextFilterVisible: boolean;
  onToggleTextFilterInput: () => void;
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
  function ItemFilters(
    {
      items,
      filters,
      onChange,
      selectMode,
      isTextFilterVisible,
      onToggleTextFilterInput,
    },
    ref,
  ) {
    const [dateAnchorEl, setDateAnchorEl] = useState<HTMLButtonElement | null>(
      null,
    );
    const [showInlineCalendar, setShowInlineCalendar] = useState(false);
    const [activeDateField, setActiveDateField] = useState<"start" | "end">(
      "start",
    );
    const filterButtonRef = useRef<HTMLButtonElement>(null);

    useImperativeHandle(ref, () => ({
      openWithCalendar(anchor) {
        setDateAnchorEl(anchor ?? filterButtonRef.current);
        setActiveDateField("start");
        setShowInlineCalendar(true);
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

    const handleDateClose = () => {
      setDateAnchorEl(null);
      setShowInlineCalendar(false);
      setActiveDateField("start");
    };

    const CalendarDay = (props: PickerDayProps) => (
      <NoteDay {...props} noteCountsByDay={noteCountsByDay} />
    );

    const activeCalendarDateValue =
      activeDateField === "start"
        ? (startDateValue ?? endDateValue ?? filteredMaxDate)
        : (endDateValue ?? startDateValue ?? filteredMaxDate);

    const calendarMinDate =
      activeDateField === "start"
        ? filteredMinDate
        : (startDateValue ?? filteredMinDate);

    const calendarMaxDate = filteredMaxDate;

    return (
      <>
        <Tooltip title={`Filter note text`}>
          <IconButton
            ref={filterButtonRef}
            aria-label="Filter notes"
            onClick={onToggleTextFilterInput}
            color={isTextFilterVisible ? "primary" : "default"}
            disabled={items.length === 0 || selectMode}
          >
            <Icon path={mdiFilter} size={0.9} />
          </IconButton>
        </Tooltip>
        <Popover
          open={!!dateAnchorEl}
          anchorEl={dateAnchorEl}
          onClose={handleDateClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{
            paper: {
              sx: {
                backgroundColor: colors.blueGrey[900],
                border: `1px solid ${colors.blueGrey[700]}`,
                marginLeft: "-16px",
                width: "100vw",
                maxWidth: "none",
              },
            },
          }}
        >
          <Box sx={{ py: 2, px: 1 }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1}>
                <TextField
                  label="Start date"
                  size="small"
                  value={
                    startDateValue ? startDateValue.format("YYYY-MM-DD") : ""
                  }
                  onClick={() => {
                    setActiveDateField("start");
                    setShowInlineCalendar(true);
                  }}
                  slotProps={{
                    input: { readOnly: true },
                  }}
                  fullWidth
                />
                <TextField
                  label="End date"
                  size="small"
                  value={endDateValue ? endDateValue.format("YYYY-MM-DD") : ""}
                  onClick={() => {
                    setActiveDateField("end");
                    setShowInlineCalendar(true);
                  }}
                  slotProps={{
                    input: { readOnly: true },
                  }}
                  fullWidth
                />
              </Stack>
              {showInlineCalendar && (
                <Box
                  sx={{
                    backgroundColor: colors.blueGrey[900],
                    borderRadius: 1,
                    "& .MuiPickersLayout-root": {
                      backgroundColor: colors.blueGrey[900],
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
                  }}
                >
                  <StaticDatePicker
                    displayStaticWrapperAs="desktop"
                    localeText={{ okButtonLabel: "Close" }}
                    value={activeCalendarDateValue}
                    showDaysOutsideCurrentMonth
                    minDate={calendarMinDate}
                    maxDate={calendarMaxDate}
                    onChange={(value: Dayjs | null) => {
                      if (!value) {
                        onChange({ ...filters, date: "", endDate: "" });
                        handleDateClose();
                        return;
                      }
                      const nextValue = value.format("YYYY-MM-DD");
                      if (activeDateField === "start") {
                        onChange({
                          ...filters,
                          date: nextValue,
                          endDate:
                            filters.endDate && filters.endDate < nextValue
                              ? nextValue
                              : filters.endDate || nextValue,
                        });
                        return;
                      }
                      onChange({ ...filters, endDate: nextValue });
                    }}
                    slots={{ day: CalendarDay }}
                    slotProps={{
                      actionBar: {
                        actions: ["clear", "accept"],
                      },
                    }}
                    onAccept={handleDateClose}
                    onClose={() => setShowInlineCalendar(false)}
                  />
                </Box>
              )}
            </Stack>
          </Box>
        </Popover>
      </>
    );
  },
);

export default ItemFilters;
