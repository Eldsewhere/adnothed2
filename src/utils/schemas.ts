import { z } from "zod";

export const PersistedLabelSchema = z.object({
  name: z.string(),
  icon: z.string(),
  color: z.string().optional(),
});

export const PersistedNoteSchema = z.object({
  icon: z.string().nullable().optional(),
  text: z.string(),
  emoji: z.string().optional(),
  time: z.number(),
  due: z.number().nullable().optional(),
  completed: z.boolean().optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  spoiler: z.boolean().optional(),
});

export const PersistedStateSchema = z.object({
  labels: z.array(PersistedLabelSchema),
  notes: z.array(PersistedNoteSchema),
});
export type PersistedState = z.infer<typeof PersistedStateSchema>;
