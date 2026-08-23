import { useState, type MouseEvent } from "react";

import {
  Box,
  colors,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import { Icon } from "@mdi/react";

import {
  mdiArchiveOutline,
  mdiCalendar,
  mdiCalendarClock,
  mdiCalendarEnd,
  mdiCalendarStart,
  mdiCheckCircleOutline,
  mdiCheckboxBlankOutline,
  mdiChevronRight,
  mdiCircleSmall,
  mdiCloseCircleOutline,
  mdiContentCopy,
  mdiContentPaste,
  mdiEmailOutline,
  mdiEmoticonHappyOutline,
  mdiFormatLineSpacing,
  mdiFormatListBulleted,
  mdiFormatListNumbered,
  mdiFormatText,
  mdiPound,
  mdiLabelMultiple,
  mdiLinkVariant,
  mdiNumeric,
  mdiPin,
  mdiRayEndArrow,
  mdiRayStartArrow,
  mdiRayStartEnd,
  mdiSelectAll,
} from "@mdi/js";

type QueryTemplate = {
  label: string;
  command: string;
  placeholder?: string;
  iconPath: string;
};

const queryTemplates: QueryTemplate[] = [
  {
    label: "index",
    command: "/index:number;",
    placeholder: "number",
    iconPath: mdiFormatListNumbered,
  },
  {
    label: "words",
    command: "/word:number;",
    placeholder: "number",
    iconPath: mdiFormatText,
  },
  {
    label: "lines",
    command: "/lines:number;",
    placeholder: "number",
    iconPath: mdiFormatLineSpacing,
  },
  {
    label: "exact",
    command: "/length:number;",
    placeholder: "number",
    iconPath: mdiRayStartEnd,
  },
  {
    label: "min",
    command: "/minlength:number;",
    placeholder: "number",
    iconPath: mdiRayStartArrow,
  },
  {
    label: "max",
    command: "/maxlength:number;",
    placeholder: "number",
    iconPath: mdiRayEndArrow,
  },
  {
    label: "fullDate",
    command: "/date:YYYY-MM-DD;",
    placeholder: "YYYY-MM-DD",
    iconPath: mdiCalendar,
  },
  {
    label: "yearMonth",
    command: "/date:YYYY-MM;",
    placeholder: "YYYY-MM",
    iconPath: mdiCalendarStart,
  },
  {
    label: "year",
    command: "/date:YYYY;",
    placeholder: "YYYY",
    iconPath: mdiCalendarEnd,
  },
  {
    label: "min",
    command: "/mindate:YYYY-MM-DD;",
    placeholder: "YYYY-MM-DD",
    iconPath: mdiCalendarStart,
  },
  {
    label: "max",
    command: "/maxdate:YYYY-MM-DD;",
    placeholder: "YYYY-MM-DD",
    iconPath: mdiCalendarEnd,
  },
  {
    label: "fullDate",
    command: "/due:YYYY-MM-DD;",
    placeholder: "YYYY-MM-DD",
    iconPath: mdiCalendar,
  },
  {
    label: "yearMonth",
    command: "/due:YYYY-MM;",
    placeholder: "YYYY-MM",
    iconPath: mdiCalendarStart,
  },
  {
    label: "year",
    command: "/due:YYYY;",
    placeholder: "YYYY",
    iconPath: mdiCalendarEnd,
  },
  {
    label: "min",
    command: "/mindue:YYYY-MM-DD;",
    placeholder: "YYYY-MM-DD",
    iconPath: mdiCalendarStart,
  },
  {
    label: "max",
    command: "/maxdue:YYYY-MM-DD;",
    placeholder: "YYYY-MM-DD",
    iconPath: mdiCalendarEnd,
  },
  { label: "numbers", command: "/with:numbers;", iconPath: mdiNumeric },
  { label: "URL", command: "/with:url;", iconPath: mdiLinkVariant },
  {
    label: "email",
    command: "/with:email;",
    iconPath: mdiEmailOutline,
  },
  {
    label: "bullets",
    command: "/with:bullets;",
    iconPath: mdiCircleSmall,
  },
  {
    label: "checkboxes",
    command: "/with:checkboxes;",
    iconPath: mdiCheckboxBlankOutline,
  },
  {
    label: "hashtags",
    command: "/with:hashtags;",
    iconPath: mdiPound,
  },
  {
    label: "scheduled",
    command: "/with:due;",
    iconPath: mdiCalendar,
  },
  {
    label: "status",
    command: "/with:status;",
    iconPath: mdiEmoticonHappyOutline,
  },
  {
    label: "priority",
    command: "/with:priority;",
    iconPath: mdiPin,
  },
  {
    label: "label",
    command: "/with:label;",
    iconPath: mdiLabelMultiple,
  },
  {
    label: "completed",
    command: "/with:completed;",
    iconPath: mdiCheckCircleOutline,
  },
  {
    label: "archived",
    command: "/with:archived;",
    iconPath: mdiArchiveOutline,
  },
];

const querySubmenuGroups: Record<
  "count" | "length" | "date" | "due" | "with",
  QueryTemplate[]
> = {
  count: [queryTemplates[1], queryTemplates[2]],
  length: [queryTemplates[3], queryTemplates[4], queryTemplates[5]],
  date: [
    queryTemplates[6],
    queryTemplates[7],
    queryTemplates[8],
    queryTemplates[9],
    queryTemplates[10],
  ],
  due: [
    queryTemplates[11],
    queryTemplates[12],
    queryTemplates[13],
    queryTemplates[14],
    queryTemplates[15],
  ],
  with: [
    queryTemplates[16],
    queryTemplates[17],
    queryTemplates[18],
    queryTemplates[19],
    queryTemplates[20],
    queryTemplates[21],
    queryTemplates[22],
    queryTemplates[23],
    queryTemplates[24],
    queryTemplates[25],
    queryTemplates[26],
    queryTemplates[27],
  ],
};

const menuItemIconSx = {
  display: "inline-flex",
  alignItems: "center",
  mr: 1,
  py: 1,
  px: 0.5,
};

type NoteFormActionsMenuProps = {
  value: string;
  onTextChange: (str: string) => void;
  onClear: () => void;
  textAreaRef: React.RefObject<HTMLTextAreaElement | null>;
};

const NoteFormActionsMenu = ({
  value,
  onTextChange,
  onClear,
  textAreaRef,
}: NoteFormActionsMenuProps) => {
  const [formatMenuAnchor, setFormatMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [queryMenuAnchor, setQueryMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [querySubmenuAnchor, setQuerySubmenuAnchor] =
    useState<HTMLElement | null>(null);
  const [querySubmenuKey, setQuerySubmenuKey] = useState<
    "count" | "length" | "date" | "due" | "with" | null
  >(null);
  const [querySubmenuOpenLeft, setQuerySubmenuOpenLeft] = useState(false);

  const closeQueryMenu = () => {
    setQueryMenuAnchor(null);
    setQuerySubmenuAnchor(null);
    setQuerySubmenuKey(null);
    setQuerySubmenuOpenLeft(false);
  };

  const openQuerySubmenu = (
    event: MouseEvent<HTMLElement>,
    key: "count" | "length" | "date" | "due" | "with",
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const submenuWidth = 220;
    const canOpenLeft = rect.left > submenuWidth + 8;
    setQuerySubmenuAnchor(event.currentTarget);
    setQuerySubmenuKey(key);
    setQuerySubmenuOpenLeft(canOpenLeft);
  };

  const insertMarker = (
    marker: string,
    currentValue: string,
    onChange: (value: string) => void,
  ) => {
    const el = textAreaRef.current;
    const start = el?.selectionStart ?? currentValue.length;
    const end = el?.selectionEnd ?? currentValue.length;
    const existingMarker = /^(•|\[\])\s*/;

    if (start !== end) {
      const lineStart = currentValue.lastIndexOf("\n", start - 1) + 1;
      const lineEndIndex = currentValue.indexOf("\n", end);
      const lineEnd = lineEndIndex === -1 ? currentValue.length : lineEndIndex;

      const before = currentValue.slice(0, lineStart);
      const after = currentValue.slice(lineEnd);
      const selectedLines = currentValue.slice(lineStart, lineEnd).split("\n");
      const alreadyApplied = selectedLines.every((line) =>
        line.startsWith(`${marker} `),
      );

      const nextLines = selectedLines
        .map((line) =>
          alreadyApplied
            ? line.replace(existingMarker, "")
            : `${marker} ${line.replace(existingMarker, "")}`,
        )
        .join("\n");

      const nextValue = before + nextLines + after;
      onChange(nextValue);

      requestAnimationFrame(() => {
        if (!el) {
          return;
        }
        el.focus();
        el.setSelectionRange(before.length, before.length + nextLines.length);
      });
      return;
    }

    const isAtEnd = start === currentValue.length;
    const needsNewline =
      isAtEnd && currentValue[start - 1] !== "\n" && currentValue.length > 0;
    const snippet = `${needsNewline ? "\n" : ""}${marker} `;
    const nextValue =
      currentValue.slice(0, start) + snippet + currentValue.slice(start);
    onChange(nextValue);

    requestAnimationFrame(() => {
      if (!el) {
        return;
      }
      const cursor = start + snippet.length;
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  };

  const prependQueryTemplate = (
    template: QueryTemplate,
    currentValue: string,
    onChange: (value: string) => void,
  ) => {
    const trimmedCurrent = currentValue.trimStart();
    const separator = "";
    const prefix = `${template.command}${separator}`;
    const nextValue = prefix + trimmedCurrent;
    onChange(nextValue);

    requestAnimationFrame(() => {
      const el = textAreaRef.current;
      if (!el) {
        return;
      }

      el.focus();
      if (!template.placeholder) {
        const cursor = template.command.length;
        el.setSelectionRange(cursor, cursor);
        return;
      }

      const placeholderStart = template.command.indexOf(template.placeholder);
      if (placeholderStart === -1) {
        const cursor = template.command.length;
        el.setSelectionRange(cursor, cursor);
        return;
      }
      const placeholderEnd = placeholderStart + template.placeholder.length;
      el.setSelectionRange(placeholderStart, placeholderEnd);
    });
  };

  return (
    <>
      <Tooltip title="Actions">
        <IconButton
          aria-label="Open text actions"
          size="small"
          onClick={(event: MouseEvent<HTMLElement>) =>
            setFormatMenuAnchor(event.currentTarget)
          }
          sx={{
            color: colors.blueGrey[200],
            border: "none",
            backgroundColor: "transparent",
            borderRadius: 1,
            minWidth: 32,
            width: 32,
            height: 32,
            p: 0,
            boxShadow: "none",
            "&:hover": {
              backgroundColor: "rgba(148, 163, 184, 0.12)",
            },
          }}
        >
          <Icon path={mdiFormatListBulleted} size={0.8} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={formatMenuAnchor}
        open={Boolean(formatMenuAnchor)}
        onClose={() => {
          setFormatMenuAnchor(null);
          closeQueryMenu();
        }}
      >
        <MenuItem
          onClick={() => {
            insertMarker("•", value, onTextChange);
            setFormatMenuAnchor(null);
          }}
        >
          <Box component="span" sx={menuItemIconSx}>
            <Icon path={mdiCircleSmall} size={0.9} />
          </Box>
          Bullet
        </MenuItem>
        <MenuItem
          onClick={() => {
            insertMarker("[]", value, onTextChange);
            setFormatMenuAnchor(null);
          }}
        >
          <Box component="span" sx={menuItemIconSx}>
            <Icon path={mdiCheckboxBlankOutline} size={0.75} />
          </Box>
          Checkbox
        </MenuItem>
        <MenuItem
          onClick={() => {
            const el = textAreaRef.current;
            const currentValue = value;
            const start = el?.selectionStart ?? currentValue.length;
            const end = el?.selectionEnd ?? currentValue.length;
            const nextValue =
              currentValue.slice(0, start) + "#" + currentValue.slice(end);
            onTextChange(nextValue);
            setFormatMenuAnchor(null);

            requestAnimationFrame(() => {
              if (!el) {
                return;
              }
              el.focus();
              const cursor = start + 1;
              el.setSelectionRange(cursor, cursor);
            });
          }}
        >
          <Box component="span" sx={menuItemIconSx}>
            <Icon path={mdiPound} size={0.75} />
          </Box>
          Hashtag
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setFormatMenuAnchor(null);
            requestAnimationFrame(() => {
              const el = textAreaRef.current;
              console.log(el, value);
              if (!el) {
                return;
              }
              el.focus();
              el.setSelectionRange(0, value.length);
            });
          }}
        >
          <Box component="span" sx={menuItemIconSx}>
            <Icon path={mdiSelectAll} size={0.75} />
          </Box>
          Select
        </MenuItem>
        <MenuItem
          onClick={() => {
            onClear();
            setFormatMenuAnchor(null);
            closeQueryMenu();
            requestAnimationFrame(() => textAreaRef.current?.focus());
          }}
        >
          <Box component="span" sx={menuItemIconSx}>
            <Icon path={mdiCloseCircleOutline} size={0.75} />
          </Box>
          Clear
        </MenuItem>
        <MenuItem
          onClick={() => {
            void navigator.clipboard.writeText(value);
            setFormatMenuAnchor(null);
            closeQueryMenu();
          }}
        >
          <Box component="span" sx={menuItemIconSx}>
            <Icon path={mdiContentCopy} size={0.75} />
          </Box>
          Copy
        </MenuItem>
        <MenuItem
          onClick={async () => {
            const text = await navigator.clipboard.readText();
            onTextChange(value + text);
            setFormatMenuAnchor(null);
            closeQueryMenu();
          }}
        >
          <Box component="span" sx={menuItemIconSx}>
            <Icon path={mdiContentPaste} size={0.75} />
          </Box>
          Paste
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={(event: MouseEvent<HTMLElement>) => {
            setQueryMenuAnchor(event.currentTarget);
          }}
        >
          <Box component="span" sx={menuItemIconSx}>
            <Icon path={mdiChevronRight} size={0.75} />
          </Box>
          Query
        </MenuItem>
      </Menu>
      <Menu
        anchorEl={queryMenuAnchor}
        open={Boolean(queryMenuAnchor)}
        onClose={closeQueryMenu}
        anchorOrigin={{ horizontal: "left", vertical: "top" }}
        transformOrigin={{
          horizontal: "left",
          vertical: "top",
        }}
      >
        <MenuItem
          onClick={() => {
            prependQueryTemplate(queryTemplates[0], value, onTextChange);
            closeQueryMenu();
            setFormatMenuAnchor(null);
          }}
        >
          <Box component="span" sx={menuItemIconSx}>
            <Icon path={queryTemplates[0].iconPath} size={0.75} />
          </Box>
          {queryTemplates[0].label}
        </MenuItem>
        <MenuItem onClick={(event) => openQuerySubmenu(event, "count")}>
          <Box component="span" sx={menuItemIconSx}>
            <Icon path={mdiFormatText} size={0.75} />
          </Box>
          Count
        </MenuItem>
        <MenuItem onClick={(event) => openQuerySubmenu(event, "length")}>
          <Box component="span" sx={menuItemIconSx}>
            <Icon path={mdiRayStartEnd} size={0.75} />
          </Box>
          Length
        </MenuItem>
        <MenuItem onClick={(event) => openQuerySubmenu(event, "date")}>
          <Box component="span" sx={menuItemIconSx}>
            <Icon path={mdiCalendar} size={0.75} />
          </Box>
          Date
        </MenuItem>
        <MenuItem onClick={(event) => openQuerySubmenu(event, "due")}>
          <Box component="span" sx={menuItemIconSx}>
            <Icon path={mdiCalendarClock} size={0.75} />
          </Box>
          Due
        </MenuItem>
        <MenuItem onClick={(event) => openQuerySubmenu(event, "with")}>
          <Box component="span" sx={menuItemIconSx}>
            <Icon path={mdiFormatListBulleted} size={0.75} />
          </Box>
          With
        </MenuItem>
      </Menu>
      <Menu
        anchorEl={querySubmenuAnchor}
        open={Boolean(querySubmenuAnchor) && querySubmenuKey !== null}
        onClose={closeQueryMenu}
        anchorOrigin={{
          horizontal: querySubmenuOpenLeft ? "left" : "right",
          vertical: "top",
        }}
        transformOrigin={{
          horizontal: querySubmenuOpenLeft ? "right" : "left",
          vertical: "top",
        }}
      >
        {querySubmenuKey &&
          querySubmenuGroups[querySubmenuKey].map((template) => (
            <MenuItem
              key={template.label}
              onClick={() => {
                prependQueryTemplate(template, value, onTextChange);
                closeQueryMenu();
                setFormatMenuAnchor(null);
              }}
            >
              <Box component="span" sx={menuItemIconSx}>
                <Icon path={template.iconPath} size={0.75} />
              </Box>
              {template.label}
            </MenuItem>
          ))}
      </Menu>
    </>
  );
};

export default NoteFormActionsMenu;
