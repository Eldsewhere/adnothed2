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

export type Note = {
  id: string;
  labelId: string | null;
  text: string;
  time: number;
  emoji?: string;
  hasNotification?: boolean;
  due?: number;
  completed?: boolean;
  pinned?: boolean;
  archived?: boolean;
  spoiler?: boolean;
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
