import { z } from "zod";

export const IconOptionSchema = z.object({
  name: z.string(),
  label: z.string(),
  path: z.string(),
});

export const StatusFormatSchema = z.enum([
  "none",
  "underline",
  "bold",
  "strikethrough",
  "red",
  "orange",
  "green",
]);

export const PersistedLabelSchema = z.object({
  name: z.string(),
  icon: z.string(),
  color: z.string().optional(),
});

export const PersistedStatusSchema = z.object({
  name: z.string(),
  emoji: z.string(),
  format: StatusFormatSchema,
});

export const PersistedNoteSchema = z.object({
  icon: z.string().nullable().optional(),
  text: z.string(),
  emotion: z.string().optional(),
  emoji: z.string().optional(),
  time: z.number(),
  due: z.number().nullable().optional(),
  pinned: z.boolean().optional(),
});

export const PersistedStateSchema = z.object({
  labels: z.array(PersistedLabelSchema),
  statuses: z.array(PersistedStatusSchema).optional().default([]),
  notes: z.array(PersistedNoteSchema),
});

export const AnyPersistedStateSchema = PersistedStateSchema;

export const ExportedStateSchema = PersistedStateSchema;
export type IconOption = z.infer<typeof IconOptionSchema>;
export type PersistedState = z.infer<typeof PersistedStateSchema>;
export type ExportedState = z.infer<typeof ExportedStateSchema>;
