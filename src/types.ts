export type IconOption = {
  /** Raw export name from @mdi/js, e.g. "mdiAccountOutline" */
  name: string;
  /** Human readable label, e.g. "Account Outline" */
  label: string;
  /** SVG path data used to render the icon */
  path: string;
};

export type Category = {
  id: string;
  name: string;
  icon: IconOption;
};

export type CategoryFormValues = {
  name: string;
  icon: IconOption | null;
};

export type Item = {
  id: string;
  categoryId: string | null;
  text: string;
  createdAt: number;
};

export type ItemFormValues = {
  categoryId: string;
  text: string;
};

export type ItemFilters = {
  categoryId: string;
  text: string;
  date: string;
  endDate: string;
  hasUrl: boolean;
  hasNumber: boolean;
};

