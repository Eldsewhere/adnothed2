import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Box, IconButton, Stack, TextField, Tooltip } from "@mui/material";
import { Icon } from "@mdi/react";
import type { Item, ItemFormValues } from "../types";
import { mdiCancel, mdiCheck } from "@mdi/js";

type ItemFormProps = {
  editingItem: Item | null;
  onSubmit: (values: ItemFormValues) => void;
  onCancelEdit: () => void;
};

const emptyValues: ItemFormValues = { categoryId: "", text: "" };

const ItemForm = ({ editingItem, onSubmit, onCancelEdit }: ItemFormProps) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ItemFormValues>({ defaultValues: emptyValues });

  useEffect(() => {
    reset(
      editingItem
        ? { categoryId: editingItem.categoryId ?? "", text: editingItem.text }
        : emptyValues,
    );
  }, [editingItem, reset]);

  const submit = handleSubmit((values) => {
    onSubmit(values);
    reset(emptyValues);
  });

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <Stack
        direction="row"
        sx={{ alignItems: "flex-start", flexWrap: "wrap", gap: 1 }}
      >
        <Stack direction="row" sx={{ alignItems: "flex-start", width: "100%" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Controller
              name="text"
              control={control}
              rules={{ required: "Note is required" }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Note"
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  error={!!errors.text}
                  helperText={errors.text?.message}
                />
              )}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 1, ml: { sm: 1 } }}>
            <Tooltip title={editingItem ? "Update note" : "Add note"}>
              <span>
                <IconButton
                  type="submit"
                  aria-label={editingItem ? "Update note" : "Add note"}
                  color={"primary"}
                >
                  <Icon path={mdiCheck} size={0.9} />
                </IconButton>
              </span>
            </Tooltip>
            {editingItem && (
              <Tooltip title="Cancel edit">
                <span>
                  <IconButton
                    onClick={() => {
                      onCancelEdit();
                      reset(emptyValues);
                    }}
                    aria-label="Cancel"
                    color={"primary"}
                  >
                    <Icon path={mdiCancel} size={0.9} />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
};

export default ItemForm;
