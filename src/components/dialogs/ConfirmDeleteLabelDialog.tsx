import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

type ConfirmDeleteLabelDialogProps = {
  open: boolean;
  categoryName: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

const ConfirmDeleteLabelDialog = ({
  open,
  categoryName,
  onClose,
  onConfirm,
}: ConfirmDeleteLabelDialogProps) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>{`Delete label "${categoryName ?? ""}"?`}</DialogTitle>
    <DialogContent>
      <DialogContentText>
        Deleting this label will remove it and set any notes in this label to
        have no label
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button variant="outlined" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="contained" onClick={onConfirm}>
        Delete
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDeleteLabelDialog;
