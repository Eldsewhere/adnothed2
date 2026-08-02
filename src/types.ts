export type IconOption = {
  name: string;
  label: string;
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
  hasNotification?: boolean;
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
