import {
  Box,
  Button,
  ButtonBase,
  colors,
  IconButton,
  Popover,
  Stack,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useState } from "react";
import type { Label, LabelFormValues, Note } from "../../types";
import { mdiClose, mdiLabelOff, mdiPlus } from "@mdi/js";
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
  onCreateLabel?: () => void;
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
  onCreateLabel,
  management,
}: LabelMenuProps) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [isLabelFormOpen, setIsLabelFormOpen] = useState(false);
  const popoverSx = isSmallScreen
    ? {
        width: "100vw",
        maxWidth: "100vw",
        height: "100vh",
        maxHeight: "100vh",
        margin: 0,
        borderRadius: 0,
        border: "none",
        boxShadow: "none",
        overflow: "hidden",
        left: 0,
        top: 0,
      }
    : {
        width: 360,
        maxWidth: "calc(100vw - 32px)",
        border: "none",
        boxShadow: "none",
      };

  if (management) {
    const showLabelForm = isLabelFormOpen || management.editingLabel !== null;

    return (
      <Popover
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={onClose}
        marginThreshold={0}
        anchorOrigin={
          isSmallScreen
            ? { vertical: "top", horizontal: "left" }
            : { vertical: "bottom", horizontal: "left" }
        }
        transformOrigin={
          isSmallScreen
            ? { vertical: "top", horizontal: "left" }
            : { vertical: "top", horizontal: "left" }
        }
        slotProps={{
          paper: {
            sx: {
              ...popoverSx,
              overflow: "hidden",
              outline: "none",
            },
          },
        }}
      >
        <Stack
          spacing={1}
          sx={{
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 1.5,
              py: 1,
              backgroundColor: colors.blueGrey[800],
            }}
          >
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                fontSize: "0.82rem",
                fontWeight: 700,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              Labels ({labels.length})
            </Box>
            <IconButton
              size="small"
              onClick={onClose}
              aria-label="Close labels"
              sx={{
                backgroundColor: colors.blueGrey[700],
              }}
            >
              <Icon path={mdiClose} size={0.7} />
            </IconButton>
          </Box>
          <Box sx={{ px: 1.5, pb: 1.5 }}>
            <Button
              startIcon={<Icon path={mdiPlus} size={0.7} />}
              variant="outlined"
              onClick={() => {
                management.onCancelEdit();
                setIsLabelFormOpen(true);
              }}
              sx={{
                width: "100%",
                justifyContent: "center",
                mb: 1,
              }}
            >
              Create label
            </Button>
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
            ) : null}
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
                p: 2,
                textAlign: "left",
                width: "100%",
                ...((selected === null || selected === "") && {
                  bgcolor: "action.selected",
                }),
              }}
            >
              <Box
                component="span"
                sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
              >
                <Icon path={mdiLabelOff} size={0.7} />
              </Box>
              No label
            </ButtonBase>
            <LabelList
              labels={labels}
              notes={management.notes}
              editingLabelId={management.editingLabel?.id ?? null}
              selectedLabelId={selected ?? null}
              onEdit={(label) => {
                management.onEdit(label);
                setIsLabelFormOpen(true);
              }}
              onDelete={management.onDelete}
              newlabelId={management.newLabelId}
              onSelect={(label) => onSelect(label.id)}
            />
          </Box>
        </Stack>
      </Popover>
    );
  }

  return (
    <Popover
      anchorEl={anchorEl}
      open={!!anchorEl}
      onClose={onClose}
      marginThreshold={0}
      anchorOrigin={
        isSmallScreen
          ? { vertical: "top", horizontal: "left" }
          : { vertical: "bottom", horizontal: "left" }
      }
      transformOrigin={
        isSmallScreen
          ? { vertical: "top", horizontal: "left" }
          : { vertical: "top", horizontal: "left" }
      }
      slotProps={{
        paper: {
          sx: {
            ...popoverSx,
            overflow: isSmallScreen ? "visible" : "hidden",
            outline: "none",
          },
        },
      }}
    >
      <Stack
        spacing={1}
        sx={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 1.5,
            py: 1,
            backgroundColor: "rgba(255,255,255,0.06)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 1,
              fontSize: "0.82rem",
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            Labels
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 22,
                px: 0.75,
                py: 0.15,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.1)",
                fontSize: "0.72rem",
                lineHeight: 1.2,
              }}
            >
              ({labels.length})
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={onClose}
            aria-label="Close labels"
            sx={{
              color: "rgba(255,255,255,0.8)",
              backgroundColor: "rgba(255,255,255,0.04)",
            }}
          >
            <Icon path={mdiClose} size={0.7} />
          </IconButton>
        </Box>
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          <Button
            startIcon={<Icon path={mdiPlus} size={0.7} />}
            onClick={() => {
              onCreateLabel?.();
              onClose();
            }}
            sx={{
              width: "100%",
              justifyContent: "center",
            }}
          >
            Create label
          </Button>
          {onShowAllSelect && labels.length > 0 && (
            <ButtonBase
              onClick={() => {
                onShowAllSelect();
                onClose();
              }}
              sx={{
                alignItems: "center",
                bgcolor: colors.blueGrey[900],
                borderBottom: "3px solid",
                borderColor: colors.grey[900],
                borderRadius: 1,
                cursor: "pointer",
                display: "flex",
                justifyContent: "flex-start",
                minHeight: 36,
                px: 2,
                textAlign: "left",
                width: "100%",
              }}
            >
              Show All
            </ButtonBase>
          )}
          <ButtonBase
            onClick={() => {
              onSelect(null);
              onClose();
            }}
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
              px: 2,
              textAlign: "left",
              width: "100%",
              ...((selected === null || selected === "") && {
                bgcolor: "action.selected",
              }),
            }}
          >
            <Box
              component="span"
              sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
            >
              <Icon path={mdiLabelOff} size={0.7} />
            </Box>
            {labels.length === 0 ? "no labels available" : "no label"}
          </ButtonBase>
          <LabelList
            labels={labels}
            notes={[]}
            onEdit={() => undefined}
            onDelete={() => undefined}
            onSelect={(label) => {
              onSelect(label.id);
              onClose();
            }}
          />
        </Box>
      </Stack>
    </Popover>
  );
};

export default LabelMenu;
