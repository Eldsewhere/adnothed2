import {
  Box,
  Button,
  ButtonBase,
  colors,
  Menu,
  MenuItem,
  Popover,
  Stack,
} from "@mui/material";
import { useState } from "react";
import LabelIcon from "../ui/LabelIcon";
import type { Label, LabelFormValues, Note } from "../../types";
import { mdiLabelOff, mdiPlus } from "@mdi/js";
import { Icon } from "@mdi/react";
import LabelForm from "../LabelForm";
import LabelList from "../LabelList";

type LabelMenuProps = {
  anchorEl: HTMLElement | null;
  labels: Label[];
  labelCounts?: Map<string, number> | Record<string, number>;
  onClose: () => void;
  onSelect: (labelId: string | null) => void;
  selected?: string | null;
  onShowAllSelect?: () => void;
  management?: {
    notes: Note[];
    editingLabel: Label | null;
    onSubmit: (
      values: LabelFormValues & {
        icon: NonNullable<LabelFormValues["icon"]>;
      },
    ) => void | boolean;
    onCancelEdit: () => void;
    onEdit: (label: Label) => void;
    onDelete: (label: Label) => void;
    newLabelId?: string | null;
  };
};

const LabelMenu = ({
  anchorEl,
  labels,
  labelCounts: _labelCounts,
  onClose,
  onSelect,
  selected,
  onShowAllSelect,
  management,
}: LabelMenuProps) => {
  const [isLabelFormOpen, setIsLabelFormOpen] = useState(false);

  if (management) {
    const showLabelForm = isLabelFormOpen || management.editingLabel !== null;

    return (
      <Popover
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={onClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <Stack spacing={1} sx={{ width: 360, maxWidth: "calc(100vw - 32px)", p: 1 }}>
          {showLabelForm ? (
            <LabelForm
              editingLabel={management.editingLabel}
              onSubmit={(values) => {
                const result = management.onSubmit(values);
                if (result !== false) {
                  setIsLabelFormOpen(false);
                }
                return result;
              }}
              onCancelEdit={() => {
                management.onCancelEdit();
                setIsLabelFormOpen(false);
              }}
            />
          ) : (
            <Button
              startIcon={<Icon path={mdiPlus} size={0.7} />}
              onClick={() => {
                management.onCancelEdit();
                setIsLabelFormOpen(true);
              }}
            >
              Create label
            </Button>
          )}
          <ButtonBase
            onClick={() => onSelect(null)}
            sx={{
              alignItems: "center",
              bgcolor: colors.blueGrey[900],
              borderBottom: "3px solid",
              borderColor: colors.grey[900],
              borderRadius: 1,
              color: colors.blueGrey[300],
              cursor: "pointer",
              display: "flex",
              justifyContent: "flex-start",
              minHeight: 36,
              px: 1.5,
              textAlign: "left",
              width: "100%",
              ...(selected === null && {
                bgcolor: "action.selected",
              }),
            }}
          >
            <Box component="span" sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}>
              <Icon path={mdiLabelOff} size={0.7} />
            </Box>
            No label
          </ButtonBase>
          <LabelList
            labels={labels}
            notes={management.notes}
            editingLabelId={management.editingLabel?.id ?? null}
            onEdit={(label) => {
              management.onEdit(label);
              setIsLabelFormOpen(true);
            }}
            onDelete={management.onDelete}
            newlabelId={management.newLabelId}
            onSelect={(label) => onSelect(label.id)}
          />
        </Stack>
      </Popover>
    );
  }

  return (
    <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={onClose}>
    {onShowAllSelect && labels.length > 0 && (
      <MenuItem autoFocus onClick={onShowAllSelect}>
        <span>Show All</span>
      </MenuItem>
    )}
    <MenuItem
      sx={{ color: colors.blueGrey[300] }}
      onClick={() => onSelect(null)}
      autoFocus={selected === null}
      selected={selected === null}
    >
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          mr: 1,
          color: colors.blueGrey[300],
        }}
      >
        <Icon path={mdiLabelOff} size={0.7} />
      </Box>
      {labels.length == 0 ? "no labels available" : "no label"}
    </MenuItem>
    {labels.map((label) => (
      <MenuItem
        key={label.id}
        onClick={() => onSelect(label.id)}
        autoFocus={selected === label.id}
        selected={selected === label.id}
      >
        <Box
          component="span"
          sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
        >
          <LabelIcon icon={label.icon} color={label.color} size={0.7} />
        </Box>
        {label.name}
      </MenuItem>
    ))}
  </Menu>
  );
};

export default LabelMenu;
