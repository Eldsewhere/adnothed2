import { colors } from "@mui/material";
import type { StatusFormat } from "../types";

export const STATUS_FORMAT_OPTIONS = [
  "none",
  "underline",
  "bold",
  "strikethrough",
  "red",
  "orange",
  "green",
] as const;

export type StatusFormatOption = (typeof STATUS_FORMAT_OPTIONS)[number];

export const STATUS_FORMAT_LABELS: Record<StatusFormatOption, string> = {
  none: "None",
  underline: "Underline",
  bold: "Bold",
  strikethrough: "Strikethrough",
  red: "Red",
  orange: "Orange",
  green: "Green",
};

export function getStatusTextStyle(format?: StatusFormat): {
  color?: string;
  fontStyle?: "normal";
  fontWeight?: number;
  textDecoration?: string;
} {
  switch (format) {
    case "underline":
      return { textDecoration: "underline" };
    case "bold":
      return { fontWeight: 700 };
    case "strikethrough":
      return { textDecoration: "line-through" };
    case "red":
      return { color: colors.red[400] };
    case "orange":
      return { color: colors.orange[400] };
    case "green":
      return { color: colors.green[400] };
    case "none":
    default:
      return {};
  }
}
