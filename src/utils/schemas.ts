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

export const PersistedCategorySchema = z.object({
  name: z.string(),
  iconName: z.string(),
});

export const PersistedStateSchema = z.object({
  categories: z.array(PersistedCategorySchema),
  items: z.array(ItemSchema),
});

export const AppStateSchema = z.object({
  categories: z.array(CategorySchema),
  items: z.array(ItemSchema),
});

export const ExportedStateSchema = PersistedStateSchema;
export type IconOption = z.infer<typeof IconOptionSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Item = z.infer<typeof ItemSchema>;
export type PersistedState = z.infer<typeof PersistedStateSchema>;
export type ExportedState = z.infer<typeof ExportedStateSchema>;
export type AppState = z.infer<typeof AppStateSchema>;
