import type { Dayjs } from "dayjs";
import { Badge, Box, Button, Tooltip, colors } from "@mui/material";
import { Icon } from "@mdi/react";
import { mdiCalendarClock } from "@mdi/js";

const WEEKDAY_LETTERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

type WeekdayPickerProps = {
  days: Dayjs[];
  today: Dayjs;
  selectedDayKey: string | null;
  noteCountByDay: Map<string, number>;
  dueCountByDay: Map<string, number>;
  onSelect: (dayKey: string) => void;
  futureScheduledDateCount: number;
  onOpenSchedule: () => void;
};

const WeekdayPicker = ({
  days,
  today,
  selectedDayKey,
  noteCountByDay,
  dueCountByDay,
  onSelect,
  futureScheduledDateCount,
  onOpenSchedule,
}: WeekdayPickerProps) => (
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
      sx={{
        flex: 1,
        minWidth: 0,
        overflowX: "auto",
        overflowY: "visible",
        py: 1,
        "@media (max-width: 600px)": {
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
          "&::-webkit-scrollbar-thumb": {
            display: "none",
          },
          "-ms-overflow-style": "none",
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
        {days.map((day) => {
          const dayKey = day.format("YYYY-MM-DD");
          const weekday = day.day();
          const isWeekend = weekday === 0 || weekday === 6;
          const isSelected = selectedDayKey === dayKey;
          const isCurrentDay = day.isSame(today, "day");
          const hasDue = (dueCountByDay.get(dayKey) ?? 0) > 0;
          const noteCount = noteCountByDay.get(dayKey) ?? 0;
          const dueCount = dueCountByDay.get(dayKey) ?? 0;
          const badgeValue = noteCount + dueCount;

          return (
            <Tooltip key={dayKey} title={day.format("ddd, MMM D")}>
              <Badge
                badgeContent={badgeValue > 0 ? badgeValue : 0}
                color={hasDue && !isCurrentDay ? "warning" : "primary"}
                overlap="rectangular"
                anchorOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                sx={{
                  "& .MuiBadge-badge": {
                    minWidth: 12,
                    height: 12,
                    fontSize: "0.5rem",
                  },
                }}
              >
                <Button
                  variant={isSelected ? "contained" : "outlined"}
                  onClick={() => onSelect(dayKey)}
                  sx={{
                    minWidth: 32,
                    width: 32,
                    height: 34,
                    p: 0,
                    borderRadius: 2,
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
                          : isWeekend
                            ? "rgba(120, 144, 156, 0.95)"
                            : colors.blueGrey[600],
                    backgroundColor: isSelected
                      ? colors.lightBlue[900]
                      : isCurrentDay
                        ? "rgba(33, 150, 243, 0.32)"
                        : hasDue
                          ? "rgba(255, 152, 0, 0.24)"
                          : day.date() === 1
                            ? "rgba(76, 175, 80, 0.24)"
                            : isWeekend
                              ? "rgba(120, 144, 156, 0.42)"
                              : "rgba(96, 125, 139, 0.16)",
                    "&:hover": {
                      backgroundColor: isSelected
                        ? colors.lightBlue[600]
                        : hasDue
                          ? "rgba(255, 152, 0, 0.32)"
                          : isCurrentDay
                            ? "rgba(33, 150, 243, 0.45)"
                            : day.date() === 1
                              ? "rgba(76, 175, 80, 0.32)"
                              : isWeekend
                                ? "rgba(120, 144, 156, 0.58)"
                                : "rgba(96, 125, 139, 0.24)",
                      borderColor: isSelected
                        ? colors.lightBlue[500]
                        : isCurrentDay
                          ? colors.lightBlue[300]
                          : isWeekend
                            ? colors.blueGrey[300]
                            : colors.blueGrey[500],
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      height: "100%",
                      py: 0.45,
                      lineHeight: 1,
                    }}
                  >
                    <Box
                      sx={{
                        fontSize: "0.65rem",
                        letterSpacing: "-0.04em",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {WEEKDAY_LETTERS[weekday]}
                    </Box>
                    <Box
                      sx={{
                        fontSize: "0.57rem",
                        letterSpacing: "-0.04em",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 0.9,
                      }}
                    >
                      {day.date()}
                    </Box>
                  </Box>
                </Button>
              </Badge>
            </Tooltip>
          );
        })}
        <Tooltip title="Schedule note">
          <Badge
            badgeContent={futureScheduledDateCount}
            color="warning"
            overlap="rectangular"
            sx={{
              "& .MuiBadge-badge": {
                minWidth: 12,
                height: 12,
                fontSize: "0.5rem",
              },
            }}
          >
            <Button
              variant="outlined"
              aria-label="Schedule note"
              onClick={onOpenSchedule}
              sx={{
                minWidth: 32,
                width: 32,
                height: 34,
                p: 0,
                borderRadius: 2,
                color: colors.orange[100],
                borderColor: "rgba(255, 152, 0, 0.6)",
                backgroundColor: "rgba(255, 152, 0, 0.24)",
                "&:hover": {
                  backgroundColor: "rgba(255, 152, 0, 0.32)",
                  borderColor: colors.orange[300],
                },
              }}
            >
              <Icon path={mdiCalendarClock} size={0.65} />
            </Button>
          </Badge>
        </Tooltip>
      </Box>
    </Box>
  </Box>
);

export default WeekdayPicker;
