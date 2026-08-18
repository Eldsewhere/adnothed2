import type { Dispatch, SetStateAction } from "react";
import {
    Badge,
  Box,
  Button,
  colors,
  IconButton,
  Popover,
  Tooltip,
  Typography,
} from "@mui/material";
import { DateCalendar } from "@mui/x-date-pickers";
import { PickerDay, type PickerDayProps } from "@mui/x-date-pickers/PickerDay";
import { Icon } from "@mdi/react";
import {
  mdiCalendar,
  mdiCheckCircle,
  mdiClose,
  mdiTrashCanOutline,
} from "@mdi/js";
import dayjs, { type Dayjs } from "dayjs";

export type DateFilterState = {
  date: string;
  endDate: string;
  dueDate?: string;
  hasDue?: boolean;
};

type DateFilterPopoverProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  datePickerMode: "start" | "end";
  titleRangeSuffix: string;
  activeStartDate: Dayjs | null;
  activeEndDate: Dayjs | null;
  pendingDateFilter: DateFilterState;
  setPendingDateFilter: Dispatch<SetStateAction<DateFilterState>>;
  applyDateFilter: (nextFilter: DateFilterState) => void;
  clearDateFilter: () => void;
  filteredMinDate: Dayjs | undefined;
  noteCountsByDay: Map<string, number>;
  today: Dayjs;
  setDatePickerMode: Dispatch<SetStateAction<"start" | "end">>;
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

const DateFilterPopover = ({
  open,
  anchorEl,
  onClose,
  datePickerMode,
  titleRangeSuffix,
  activeStartDate,
  activeEndDate,
  pendingDateFilter,
  setPendingDateFilter,
  applyDateFilter,
  clearDateFilter,
  filteredMinDate,
  noteCountsByDay,
  today,
  setDatePickerMode,
}: DateFilterPopoverProps) => {
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
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
            onClick={onClose}
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
          value={datePickerMode === "start" ? activeStartDate : activeEndDate}
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
              : (activeStartDate ?? filteredMinDate) ?? undefined
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
          <Button
            variant="outlined"
            color="info"
            startIcon={<Icon path={mdiCalendar} size={0.9} />}
            onClick={() => {
              const fallbackStart = dayjs().format("YYYY-MM-DD");
              setPendingDateFilter((prev) => ({
                ...prev,
                date: prev.date || fallbackStart,
                endDate: prev.endDate || prev.date || fallbackStart,
              }));
              setDatePickerMode("end");
            }}
            sx={{ textTransform: "none", fontSize: "0.75rem" }}
          >
            End Date
          </Button>
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
              clearDateFilter();
              onClose();
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
              onClose();
            }}
            sx={{ color: colors.lightGreen[400] }}
          >
            <Icon path={mdiCheckCircle} size={0.9} />
          </IconButton>
        </Tooltip>
      </Box>
    </Popover>
  );
};

export default DateFilterPopover;
