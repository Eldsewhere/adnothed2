import { mdiCircle, mdiCircleMedium } from "@mdi/js";
import { Icon } from "@mdi/react";
import { Box, colors, Stack, Tooltip } from "@mui/material";

interface MultiLayerProgressBarProps {
  maxBigSections?: number;
  timestamp?: number;
}

export const MultiLayerProgressBar: React.FC<MultiLayerProgressBarProps> = ({
  maxBigSections = 4,
  timestamp,
}) => {
  if (!timestamp) return null;

  const now = new Date();
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const date = new Date(timestamp * 1000);

  const currentStep = Math.floor(
    (date.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24),
  );

  const daysAfter = currentStep > 0 ? currentStep : 0;

  // 1. Calculate days remaining in the current calendar week (ending on Sunday)
  const todayDay = todayMidnight.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysLeftInCurrentWeek = todayDay === 0 ? 0 : 7 - todayDay;

  // 2. Distribute the total steps across the three phases
  const daysThisWeek = Math.min(currentStep, daysLeftInCurrentWeek);
  const remainingDaysAfterThisWeek = currentStep - daysThisWeek;

  const completedBigSections = Math.floor(remainingDaysAfterThisWeek / 7);
  const extraDays = remainingDaysAfterThisWeek % 7;

  // Fallback to text if the full week count exceeds maximum allowed blocks
  if (completedBigSections >= maxBigSections) {
    return <Box sx={{ ml: 0.3 }}>{`${daysAfter} days`}</Box>;
  }

  // Helper to check if a specific day offset from today lands on a weekend
  const isWeekendStep = (stepIndex: number) => {
    const stepDate = new Date(todayMidnight.getTime());
    stepDate.setDate(stepDate.getDate() + stepIndex + 1);
    const dayOfWeek = stepDate.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  return (
    <Tooltip title={`in ${daysAfter} days`}>
      <Stack direction="row" spacing={0} sx={{ alignItems: "center", ml: 0.5 }}>
        {/* Phase 1: Remaining days of this current week */}
        {Array.from({ length: daysThisWeek }).map((_, stepIndex) => {
          const isWeekend = isWeekendStep(stepIndex);
          return (
            <Icon
              key={`this-week-${stepIndex}`}
              path={mdiCircleMedium}
              size={0.5}
              style={{
                color: isWeekend ? colors.red[500] : colors.orange[500],
              }}
            />
          );
        })}

        {/* Phase 2: Full weeks represented as big circles */}
        {Array.from({ length: completedBigSections }).map((_, sectionIndex) => (
          <Icon
            key={`big-${sectionIndex}`}
            path={mdiCircle}
            size={0.5}
            style={{
              color: colors.orange[500],
            }}
          />
        ))}

        {/* Phase 3: Extra trailing days left over at the end */}
        {Array.from({ length: extraDays }).map((_, stepIndex) => {
          // Calculate exact global day offset to evaluate weekend state correctly
          const exactStep = daysThisWeek + completedBigSections * 7 + stepIndex;
          const isWeekend = isWeekendStep(exactStep);
          return (
            <Icon
              key={`extra-${stepIndex}`}
              path={mdiCircleMedium}
              size={0.5}
              style={{
                color: isWeekend ? colors.red[500] : colors.orange[500],
              }}
            />
          );
        })}
      </Stack>
    </Tooltip>
  );
};
