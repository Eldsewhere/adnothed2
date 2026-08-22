import { colors } from "@mui/material";
import type { StatusFormat } from "../types";

export const STATUS_FORMAT_OPTIONS = [
  "none",
  "underline",
  "bold",
  "strikethrough",
  "spoiler",
  "transparent",
  "red",
  "amber",
  "green",
] as const;

export type StatusFormatOption = (typeof STATUS_FORMAT_OPTIONS)[number];

export const STATUS_FORMAT_LABELS: Record<StatusFormatOption, string> = {
  none: "No note effect",
  underline: "Underline",
  bold: "Bold",
  strikethrough: "Strikethrough",
  spoiler: "S•p•o•i•l•e•r",
  transparent: "Transparent",
  red: "Red",
  amber: "Amber",
  green: "Green",
};

export function getStatusTextStyle(format?: StatusFormat): {
  color?: string;
  fontStyle?: "normal";
  fontWeight?: number;
  textDecoration?: string;
  filter?: string;
  textShadow?: string;
  userSelect?: "none";
  opacity?: number;
} {
  switch (format) {
    case "underline":
      return { textDecoration: "underline" };
    case "bold":
      return { fontWeight: 700 };
    case "strikethrough":
      return { textDecoration: "line-through" };
    case "spoiler":
      return {};
    case "transparent":
      return { opacity: 0.2 };
    case "red":
      return { color: colors.red[400] };
    case "amber":
      return { color: colors.amber[400] };
    case "green":
      return { color: colors.green[400] };
    case "none":
    default:
      return {};
  }
}
