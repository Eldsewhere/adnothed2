export type IconOption = {
  name: string;
  label: string;
  path: string;
};

export type Label = {
  id: string;
  name: string;
  icon: IconOption;
  color?: string;
};

export type LabelFormValues = {
  name: string;
  icon: IconOption | null;
  color?: string;
};

export type StatusFormat =
  | "none"
  | "underline"
  | "bold"
  | "strikethrough"
  | "spoiler"
  | "red"
  | "orange"
  | "green";

export type Status = {
  id: string;
  name: string;
  emoji: string;
  format: StatusFormat;
};

export type StatusFormValues = {
  name: string;
  emoji: string;
  format: StatusFormat;
};

export type Note = {
  id: string;
  labelId: string | null;
  text: string;
  createdAt: number;
  emoji?: string;
  hasNotification?: boolean;
  due?: number;
  pinned?: boolean;
  updatedAt?: number;
};

export type NoteFormValues = {
  labelId: string;
  text: string;
};

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type NoteFilters = {
  labelId: string;
  text: string;
  date: string;
  endDate: string;
  hasNumber: boolean;
  isOneWord: boolean;
  indexAt: string;
  dueDate: string;
  hasDue: boolean;
  weekday: string | null;
};
