import { useMemo } from "react";
import {
  Box,
  Button,
  colors,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Badge,
  Typography,
} from "@mui/material";
import { DateCalendar } from "@mui/x-date-pickers";
import { PickerDay, type PickerDayProps } from "@mui/x-date-pickers/PickerDay";
import { Icon } from "@mdi/react";
import {
  mdiCalendarPlus,
  mdiCheckCircle,
  mdiClose,
  mdiTrashCanOutline,
} from "@mdi/js";
import dayjs, { type Dayjs } from "dayjs";

type DueDateDialogProps = {
  open: boolean;
  onClose: () => void;
  value: Dayjs | null;
  onChange: (value: Dayjs | null) => void;
  minDate?: Dayjs | null;
  maxDate?: Dayjs | null;
  hour12: number;
  amPm: "AM" | "PM";
  minute:
    | 0
    | 5
    | 10
    | 15
    | 20
    | 25
    | 30
    | 35
    | 40
    | 45
    | 50
    | 55;
  onHourChange: (hour: number) => void;
  onAmPmChange: (value: "AM" | "PM") => void;
  onMinuteChange: (
    minute:
      | 0
      | 5
      | 10
      | 15
      | 20
      | 25
      | 30
      | 35
      | 40
      | 45
      | 50
      | 55,
  ) => void;
  onSave: () => void;
  onGoogleCalendar?: () => void;
  googleCalendarDisabled?: boolean;
  onRemove?: () => void;
  showRemoveButton?: boolean;
  dueDaysByDate?: Map<string, number>;
  noteCountsByDay?: Map<string, number>;
  startDate?: Dayjs | null;
  endDate?: Dayjs | null;
  title?: string;
};

type DueDateDayProps = PickerDayProps & {
  dueDaysByDate: Map<string, number>;
  noteCountsByDay: Map<string, number>;
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  calendarToday: Dayjs;
};

const DueDateDay = ({
  day,
  dueDaysByDate,
  noteCountsByDay,
  startDate,
  endDate,
  calendarToday,
  outsideCurrentMonth,
  disabled,
  ...other
}: DueDateDayProps) => {
  const key = dayjs(day).format("YYYY-MM-DD");
  const dueCount = dueDaysByDate.get(key) ?? 0;
  const hasDue = dueCount > 0;
  const isDisabled = Boolean(disabled || day.isBefore(calendarToday, "day"));
  const isRangeBoundary =
    startDate?.isSame(day, "day") || endDate?.isSame(day, "day");
  const showBadge = !isDisabled && (dueCount > 0);

  return (
    <Badge
      overlap="circular"
      badgeContent={showBadge ? dueCount : 0}
      color={hasDue ? "warning" : "default"}
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
        disabled={isDisabled}
        sx={{
          color: isDisabled
            ? colors.blueGrey[500]
            : outsideCurrentMonth
              ? colors.blueGrey[500]
              : colors.blueGrey[100],
          opacity: isDisabled ? 0.5 : 1,
          backgroundColor: isDisabled
            ? "transparent"
            : isRangeBoundary
              ? "rgba(33, 150, 243, 0.12)"
              : hasDue
                ? "rgba(255, 152, 0, 0.2)"
                : "transparent",
          border: isDisabled
            ? "1px solid transparent"
            : hasDue
              ? `2px solid ${colors.orange[400]}`
              : isRangeBoundary
                ? `1px solid ${colors.blue[600]}`
                : "1px solid transparent",
          "&:hover, &:focus": {
            backgroundColor: isDisabled
              ? "transparent"
              : hasDue
                ? "rgba(255, 152, 0, 0.28)"
                : "rgba(96,125,139,0.24)",
          },
          "&.Mui-selected": {
            backgroundColor: colors.blue[700],
            color: colors.common.white,
            borderColor: colors.blue[600],
          },
          "&.Mui-selected:hover, &.Mui-selected:focus": {
            backgroundColor: colors.lightBlue[600],
          },
          "&.MuiPickersDay-today:not(.Mui-selected)": {
            borderColor: isDisabled ? "transparent" : colors.blueGrey[400],
          },
        }}
      />
    </Badge>
  );
};

const DueDateDialog = ({
  open,
  onClose,
  value,
  onChange,
  minDate,
  maxDate,
  hour12,
  amPm,
  minute,
  onHourChange,
  onAmPmChange,
  onMinuteChange,
  onSave,
  onGoogleCalendar,
  googleCalendarDisabled,
  onRemove,
  showRemoveButton,
  dueDaysByDate,
  noteCountsByDay,
  startDate,
  endDate,
  title = "Set due date",
}: DueDateDialogProps) => {
  const today = useMemo(() => dayjs().startOf("day"), []);
  const resolvedDueDaysByDate = dueDaysByDate ?? new Map<string, number>();
  const resolvedNoteCountsByDay = noteCountsByDay ?? new Map<string, number>();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{
          position: "relative",
          bgcolor: colors.blueGrey[800],
          color: colors.blueGrey[100],
          p: 1,
          borderBottom: `1px solid ${colors.blueGrey[700]}`,
          textAlign: "center",
        }}
      >
        {title}
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
      </DialogTitle>
      <DialogContent sx={{ bgcolor: colors.blueGrey[900], p: 0, pb: 1 }}>
        <DateCalendar
          value={value}
          onChange={onChange}
          minDate={minDate ?? today}
          maxDate={maxDate ?? undefined}
          showDaysOutsideCurrentMonth
          slots={{
            day: (props) => (
              <DueDateDay
                {...props}
                dueDaysByDate={resolvedDueDaysByDate}
                noteCountsByDay={resolvedNoteCountsByDay}
                startDate={startDate ?? null}
                endDate={endDate ?? null}
                calendarToday={today}
              />
            ),
          }}
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
          }}
        />
        <Stack
          direction="row"
          spacing={1}
          sx={{
            px: 2,
            py: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FormControl size="small" sx={{ width: 72 }}>
            <InputLabel id="due-date-hour">Hour</InputLabel>
            <Select
              label="Hour"
              labelId="due-date-hour"
              value={hour12}
              onChange={(event) => onHourChange(Number(event.target.value))}
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map(
                (hour) => (
                  <MenuItem key={hour} value={hour}>
                    {hour}
                  </MenuItem>
                ),
              )}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ width: 80 }}>
            <InputLabel id="due-date-am-pm">AM/PM</InputLabel>
            <Select
              label="AM/PM"
              labelId="due-date-am-pm"
              value={amPm}
              onChange={(event) =>
                onAmPmChange(event.target.value as "AM" | "PM")
              }
            >
              <MenuItem value="AM">AM</MenuItem>
              <MenuItem value="PM">PM</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ width: 80 }}>
            <InputLabel id="due-date-minute">Min</InputLabel>
            <Select
              label="Min"
              labelId="due-date-minute"
              value={minute}
              onChange={(event) =>
                onMinuteChange(
                  Number(event.target.value) as
                    | 0
                    | 5
                    | 10
                    | 15
                    | 20
                    | 25
                    | 30
                    | 35
                    | 40
                    | 45
                    | 50
                    | 55,
                )
              }
            >
              {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(
                (minuteOption) => (
                  <MenuItem key={minuteOption} value={minuteOption}>
                    {String(minuteOption).padStart(2, "0")}
                  </MenuItem>
                ),
              )}
            </Select>
          </FormControl>
        </Stack>
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="caption" sx={{ color: colors.blueGrey[400] }}>
            also write HHhMM or HH:MM on note field
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          bgcolor: colors.blueGrey[800],
          p: 1,
          borderTop: `1px solid ${colors.blueGrey[700]}`,
        }}
      >
        {onGoogleCalendar && (
          <Button
            variant="outlined"
            color="warning"
            startIcon={<Icon path={mdiCalendarPlus} size={0.75} />}
            onClick={onGoogleCalendar}
            disabled={googleCalendarDisabled}
          >
            +Google
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        {showRemoveButton && onRemove && (
          <Tooltip title="Remove due date">
            <IconButton
              aria-label="Remove due date"
              color="error"
              onClick={onRemove}
            >
              <Icon path={mdiTrashCanOutline} size={0.9} />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Save due date">
          <IconButton
            aria-label="Save due date"
            onClick={onSave}
            color="primary"
            sx={{ color: colors.lightGreen[400] }}
          >
            <Icon path={mdiCheckCircle} size={0.9} />
          </IconButton>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
};

export default DueDateDialog;
