import { mdiClose, mdiTrashCanOutline } from "@mdi/js";
import { Icon } from "@mdi/react";
import {
  Alert,
  Box,
  Button,
  colors,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from "@mui/material";

type NoteStorageInfoDialogProps = {
  open: boolean;
  onClose: () => void;
  onNeverShowAgain?: () => void;
};

const NoteStorageInfoDialog = ({
  open,
  onClose,
  onNeverShowAgain,
}: NoteStorageInfoDialogProps) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle sx={{ backgroundColor: colors.blueGrey[900] }}>
      Info tips
    </DialogTitle>
    <DialogContent sx={{ backgroundColor: colors.blueGrey[900] }}>
      <Stack spacing={1}>
        <Alert severity="info" sx={{ textAlign: "left" }}>
          Notes are kept in your browser only, so they might be lost if browser
          history is cleared. Backup notes using the Save as JSON button on the
          Labels tab
        </Alert>
        <Alert severity="info" sx={{ textAlign: "left" }}>
          Allow notification permission to receive a notification when adding a
          note or clicking the Notify button
        </Alert>
        <Alert severity="info" sx={{ textAlign: "left" }}>
          When writing a note, write a date in the format 20Jan and time in the
          format 12h30 or 12:30 to set a due date and time. If you add g at the
          end like 12h30g it will also open Google Calendar on submitting
        </Alert>
        <Alert severity="info" sx={{ textAlign: "left" }}>
          Search label icons by typing icon name from{" "}
          <a
            href="https://pictogrammers.com/library/mdi/"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://pictogrammers.com/library/mdi/
          </a>
        </Alert>
      </Stack>
    </DialogContent>
    <DialogActions sx={{ backgroundColor: colors.blueGrey[900] }}>
      {onNeverShowAgain ? (
        <Button
          startIcon={<Icon path={mdiTrashCanOutline} size={0.9} />}
          onClick={onNeverShowAgain}
          variant="outlined"
          color="error"
        >
          Hide info
        </Button>
      ) : (
        <Box />
      )}
      <Button
        color="primary"
        startIcon={<Icon path={mdiClose} size={0.9} />}
        onClick={onClose}
        variant="outlined"
      >
        Close
      </Button>
    </DialogActions>
  </Dialog>
);

export default NoteStorageInfoDialog;
