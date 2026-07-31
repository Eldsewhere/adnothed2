import type { ItemFilters } from "../types";

export const NO_CATEGORY_FILTER_VALUE = "__none__";

export const emptyItemFilters: ItemFilters = {
  categoryId: "",
  text: "",
  date: "",
  endDate: "",
  hasUrl: false,
  hasNumber: false,
};
