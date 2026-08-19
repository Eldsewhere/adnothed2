import { useState, type MouseEvent } from "react";

import { Box, colors, Divider, IconButton, Menu, MenuItem, Tooltip } from "@mui/material";
import { Icon } from "@mdi/react";

import {
  mdiCalendar,
  mdiCalendarEnd,
  mdiCalendarStart,
  mdiCheckboxBlankOutline,
  mdiChevronRight,
  mdiCircleSmall,
  mdiCloseCircleOutline,
  mdiContentPaste,
  mdiEmailOutline,
  mdiFormatLineSpacing,
  mdiFormatListBulleted,
  mdiFormatListNumbered,
  mdiFormatText,
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
    label: "indexAt",
    command: "/index: number;",
    placeholder: "number",
    iconPath: mdiFormatListNumbered,
  },
  {
    label: "words",
    command: "/word: number;",
    placeholder: "number",
    iconPath: mdiFormatText,
  },
  {
    label: "lines",
    command: "/lines: number;",
    placeholder: "number",
    iconPath: mdiFormatLineSpacing,
  },
  {
    label: "exact",
    command: "/length: number;",
    placeholder: "number",
    iconPath: mdiRayStartEnd,
  },
  {
    label: "min",
    command: "/minlength: number;",
    placeholder: "number",
    iconPath: mdiRayStartArrow,
  },
  {
    label: "max",
    command: "/maxlength: number;",
    placeholder: "number",
    iconPath: mdiRayEndArrow,
  },
  {
    label: "fullDate",
    command: "/date: YYYY-MM-DD;",
    placeholder: "YYYY-MM-DD",
    iconPath: mdiCalendar,
  },
  {
    label: "yearMonth",
    command: "/date: YYYY-MM;",
    placeholder: "YYYY-MM",
    iconPath: mdiCalendarStart,
  },
  {
    label: "year",
    command: "/date: YYYY;",
    placeholder: "YYYY",
    iconPath: mdiCalendarEnd,
  },
  {
    label: "min",
    command: "/mindate: YYYY-MM-DD;",
    placeholder: "YYYY-MM-DD",
    iconPath: mdiCalendarStart,
  },
  {
    label: "max",
    command: "/maxdate: YYYY-MM-DD;",
    placeholder: "YYYY-MM-DD",
    iconPath: mdiCalendarEnd,
  },
  { label: "numbers", command: "/with: numbers;", iconPath: mdiNumeric },
  { label: "URL", command: "/with: url;", iconPath: mdiLinkVariant },
  {
    label: "email",
    command: "/with: email;",
    iconPath: mdiEmailOutline,
  },
  {
    label: "bullets",
    command: "/with: bullets;",
    iconPath: mdiCircleSmall,
  },
  {
    label: "checkboxes",
    command: "/with: checkboxes;",
    iconPath: mdiCheckboxBlankOutline,
  },
  {
    label: "due date",
    command: "/with: due;",
    iconPath: mdiCalendar,
  },
  {
    label: "priority",
    command: "/with: priority;",
    iconPath: mdiPin,
  },
  {
    label: "label",
    command: "/with: label;",
    iconPath: mdiLabelMultiple,
  },
];

const querySubmenuGroups: Record<
  "count" | "length" | "date" | "with",
  QueryTemplate[]
> = {
  count: [queryTemplates[1], queryTemplates[2]],
  length: [queryTemplates[3], queryTemplates[4], queryTemplates[5]],
  date: [queryTemplates[6], queryTemplates[7], queryTemplates[8], queryTemplates[9], queryTemplates[10]],
  with: [
    queryTemplates[11],
    queryTemplates[12],
    queryTemplates[13],
    queryTemplates[14],
    queryTemplates[15],
    queryTemplates[16],
    queryTemplates[17],
    queryTemplates[18],
  ],
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
    "count" | "length" | "date" | "with" | null
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
    key: "count" | "length" | "date" | "with",
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
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
            }}
          >
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
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
            }}
          >
            <Icon path={mdiCheckboxBlankOutline} size={0.75} />
          </Box>
          Checkbox
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setFormatMenuAnchor(null);
            requestAnimationFrame(() => {
              const el = textAreaRef.current;
              console.log(el, value)
              if (!el) {
                return;
              }
              el.focus();
              el.setSelectionRange(0, value.length);
            });
          }}
        >
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
            }}
          >
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
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
            }}
          >
            <Icon path={mdiCloseCircleOutline} size={0.75} />
          </Box>
          Clear
        </MenuItem>
        <MenuItem
          onClick={async () => {
            const text = await navigator.clipboard.readText();
            onTextChange(value + text);
            setFormatMenuAnchor(null);
            closeQueryMenu();
          }}
        >
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
            }}
          >
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
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
            }}
          >
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
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
            }}
          >
            <Icon path={queryTemplates[0].iconPath} size={0.75} />
          </Box>
          {queryTemplates[0].label}
        </MenuItem>
        <MenuItem onClick={(event) => openQuerySubmenu(event, "count")}>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
            }}
          >
            <Icon path={mdiFormatText} size={0.75} />
          </Box>
          Count
        </MenuItem>
        <MenuItem onClick={(event) => openQuerySubmenu(event, "length")}>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
            }}
          >
            <Icon path={mdiRayStartEnd} size={0.75} />
          </Box>
          Length
        </MenuItem>
        <MenuItem onClick={(event) => openQuerySubmenu(event, "date")}>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
            }}
          >
            <Icon path={mdiCalendar} size={0.75} />
          </Box>
          Date
        </MenuItem>
        <MenuItem onClick={(event) => openQuerySubmenu(event, "with")}>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              mr: 1,
            }}
          >
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
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  mr: 1,
                }}
              >
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
