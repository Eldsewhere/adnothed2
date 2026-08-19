import type { StatusFormat } from "../types";

export const STATUS_FORMAT_OPTIONS = [
  "none",
  "underline",
  "italic",
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
  italic: "Italic",
  bold: "Bold",
  strikethrough: "Strikethrough",
  red: "Red",
  orange: "Orange",
  green: "Green",
};

export function getStatusTextStyle(format?: StatusFormat): {
  color?: string;
  fontStyle?: "normal" | "italic";
  fontWeight?: number;
  textDecoration?: string;
} {
  switch (format) {
    case "underline":
      return { textDecoration: "underline" };
    case "italic":
      return { fontStyle: "italic" };
    case "bold":
      return { fontWeight: 700 };
    case "strikethrough":
      return { textDecoration: "line-through" };
    case "red":
      return { color: "#f87171" };
    case "orange":
      return { color: "#fbbf24" };
    case "green":
      return { color: "#4ade80" };
    case "none":
    default:
      return {};
  }
}
