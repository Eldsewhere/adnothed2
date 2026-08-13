import { colors } from "@mui/material";

export const LABEL_COLOR_OPTIONS = [
  "amber",
  "blue",
  "blueGrey",
  "brown",
  "cyan",
  "deepOrange",
  "deepPurple",
  "green",
  "grey",
  "indigo",
  "lightBlue",
  "lightGreen",
  "lime",
  "orange",
  "pink",
  "purple",
  "red",
  "teal",
  "yellow",
] as const;

export type LabelColorName = (typeof LABEL_COLOR_OPTIONS)[number];

export const DEFAULT_LABEL_COLOR: LabelColorName = "blueGrey";

// "common" only exposes black/white, so it has no [700]/[50] shades like the rest.
export function getLabelColorSwatch(name?: string): {
  background: string;
  text: string;
} {
  const palette = (
    LABEL_COLOR_OPTIONS.includes(name as LabelColorName)
      ? colors[name as Exclude<LabelColorName, "common">]
      : colors[DEFAULT_LABEL_COLOR]
  ) as Record<700 | 50, string>;

  return { background: palette[700], text: palette[50] };
}
