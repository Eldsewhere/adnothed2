import { z } from "zod";

export const IconOptionSchema = z.object({
  name: z.string(),
  label: z.string(),
  path: z.string(),
});

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: IconOptionSchema,
});

export const ItemSchema = z.object({
  id: z.string(),
  categoryId: z.string().nullable(),
  text: z.string(),
  createdAt: z.number(),
});

export const PersistedLabelSchema = z.object({
  name: z.string(),
  icon: z.string(),
});

export const PersistedNoteSchema = z.object({
  icon: z.string().nullable().optional(),
  text: z.string(),
  time: z.number(),
});

// TODO: remove this legacy schema after the migration window closes.
export const LegacyPersistedLabelSchema = z.object({
  name: z.string(),
  iconName: z.string(),
});

// TODO: remove this legacy schema after the migration window closes.
export const LegacyPersistedNoteSchema = z.object({
  categoryId: z.string().nullable(),
  text: z.string(),
  createdAt: z.number(),
});

// TODO: remove this legacy schema after the migration window closes.
export const LegacyPersistedStateSchema = z.object({
  categories: z.array(LegacyPersistedLabelSchema),
  items: z.array(LegacyPersistedNoteSchema),
});

export const PersistedStateSchema = z.object({
  labels: z.array(PersistedLabelSchema),
  notes: z.array(PersistedNoteSchema),
});

export const AnyPersistedStateSchema = z.union([
  PersistedStateSchema,
  LegacyPersistedStateSchema,
]);

export const AppStateSchema = z.object({
  categories: z.array(CategorySchema),
  items: z.array(ItemSchema),
});

export const ExportedStateSchema = PersistedStateSchema;
export type IconOption = z.infer<typeof IconOptionSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Item = z.infer<typeof ItemSchema>;
export type PersistedState = z.infer<typeof PersistedStateSchema>;
export type LegacyPersistedState = z.infer<typeof LegacyPersistedStateSchema>;
export type ExportedState = z.infer<typeof ExportedStateSchema>;
export type AppState = z.infer<typeof AppStateSchema>;
