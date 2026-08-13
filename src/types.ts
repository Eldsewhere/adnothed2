export type IconOption = {
  name: string;
  label: string;
  path: string;
};

export type Category = {
  id: string;
  name: string;
  icon: IconOption;
  color?: string;
};

export type CategoryFormValues = {
  name: string;
  icon: IconOption | null;
  color?: string;
};

export type Item = {
  id: string;
  categoryId: string | null;
  text: string;
  createdAt: number;
  hasNotification?: boolean;
  due?: number;
  pinned?: boolean;
};

export type ItemFormValues = {
  categoryId: string;
  text: string;
};

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type ItemFilters = {
  categoryId: string;
  text: string;
  date: string;
  endDate: string;
  hasNumber: boolean;
  isOneWord: boolean;
  indexAt: string;
  dueDate: string;
  hasDue: boolean;
};
