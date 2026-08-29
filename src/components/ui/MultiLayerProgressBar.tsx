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
  const STEPS_PER_SECTION = 7;

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

  const completedBigSections = Math.floor(currentStep / STEPS_PER_SECTION);
  const activeSmallSteps = currentStep % STEPS_PER_SECTION;

  if (completedBigSections >= maxBigSections) {
    return <Box sx={{ ml: 0.3 }}>{`${daysAfter} days`}</Box>;
  }

  // Helper function to check if a specific step offset from today is a weekend
  const isWeekendStep = (stepIndex: number) => {
    const stepDate = new Date(todayMidnight.getTime());
    stepDate.setDate(stepDate.getDate() + stepIndex + 1);
    const dayOfWeek = stepDate.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
  };

  let flag = false;

  return (
    <Tooltip title={`in ${daysAfter} days`}>
      <Stack direction="row" spacing={0} sx={{ alignItems: "center", ml: 0.5 }}>
        {Array.from({ length: maxBigSections }).map((_, sectionIndex) => {
          const isCompleted = sectionIndex < completedBigSections;
          const isActive = sectionIndex === completedBigSections;

          if (!isActive && isCompleted) {
            flag = true;
            return (
              <Icon
                key={sectionIndex}
                path={mdiCircle}
                size={0.5}
                style={{
                  color: colors.orange[500],
                }}
              />
            );
          }

          if (isActive && !isCompleted) {
            return Array.from({ length: activeSmallSteps }).map(
              (_, stepIndex) => {
                // Global step index for this specific small circle
                const exactStep = sectionIndex * STEPS_PER_SECTION + stepIndex;
                const isWeekend = isWeekendStep(exactStep);

                return (
                  <Icon
                    key={stepIndex}
                    path={mdiCircleMedium}
                    size={0.5}
                    style={{
                      color:
                        isWeekend && !flag
                          ? colors.red[500]
                          : colors.orange[500],
                    }}
                  />
                );
              },
            );
          }

          return null;
        })}
      </Stack>
    </Tooltip>
  );
};
