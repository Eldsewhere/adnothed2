import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Tooltip,
} from "@mui/material";
import { Icon } from "@mdi/react";
import {
  mdiCheckboxMultipleMarkedOutline,
  mdiFolderMoveOutline,
  mdiTrashCanOutline,
} from "@mdi/js";
import CategoryForm from "./components/CategoryForm";
import CategoryList from "./components/CategoryList";
import ItemForm from "./components/ItemForm";
import ItemFilters from "./components/ItemFilters";
import ItemList from "./components/ItemList";
import TabPanel from "./components/TabPanel";
import type { Category, Item } from "./types";
import {
  DEFAULT_FILE_NAME,
  getPersistedFileName,
  loadPersistedState,
  openPersistedStateFile,
  savePersistedState,
  serializeState,
} from "./utils/storage";
import {
  requestNotificationPermission,
  showAppNotification,
} from "./utils/notifications";
import { emptyItemFilters } from "./utils/itemFilters";

type TabValue = "items" | "categories" | "utils";

function App() {
  const [activeTab, setActiveTab] = useState<TabValue>("utils");
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [itemFilters, setItemFilters] = useState(emptyItemFilters);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    new Set(),
  );
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [bulkCategoryAnchor, setBulkCategoryAnchor] =
    useState<HTMLElement | null>(null);
  const [confirmDeleteCategory, setConfirmDeleteCategory] =
    useState<Category | null>(null);
  const [storageFileName, setStorageFileName] =
    useState<string>(DEFAULT_FILE_NAME);
  const [storageReady, setStorageReady] = useState(true);
  const isInitializingRef = useRef(true);

  useEffect(() => {
    let mounted = true;

    async function loadState() {
      const persistedFileName = await getPersistedFileName();
      if (!mounted) {
        return;
      }

      setStorageFileName(persistedFileName);
      const persistedState = await loadPersistedState();
      if (!mounted) {
        return;
      }

      setCategories(persistedState.categories);
      setItems(persistedState.items);
      setStorageFileName(persistedState.fileName);
      if (persistedState.parseError) {
        setNotification(persistedState.parseError);
      }
      setStorageReady(true);
      setActiveTab("items");
      isInitializingRef.current = false;
    }

    loadState();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!storageReady || isInitializingRef.current) {
      return;
    }

    savePersistedState({ categories, items }, storageFileName);
  }, [categories, items, storageReady, storageFileName]);

  useEffect(() => {
    if (!storageReady) {
      setActiveTab("utils");
    }
  }, [storageReady]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const handleOpenStorageFile = async () => {
    const result = await openPersistedStateFile(storageFileName);
    if (!result) {
      return;
    }

    setCategories(result.categories);
    setItems(result.items);
    setStorageFileName(result.fileName);
    if (result.parseError) {
      setNotification(result.parseError);
    }
    setStorageReady(true);
    setActiveTab("items");
  };

  const handleExportJson = () => {
    const payload = serializeState({ categories, items });
    const cleanFileName = storageFileName.trim() || DEFAULT_FILE_NAME;
    const downloadName = cleanFileName.endsWith(".json")
      ? cleanFileName
      : `${cleanFileName}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit: React.ComponentProps<typeof CategoryForm>["onSubmit"] = (
    values,
  ) => {
    if (editingCategory) {
      setCategories((prev) =>
        prev.map((category) =>
          category.id === editingCategory.id
            ? {
                ...category,
                name: values.name,
                icon: values.icon,
                id: values.icon.name,
              }
            : category,
        ),
      );
      setEditingCategory(null);
      return;
    }

    // use icon name as the category identifier
    setCategories((prev) => [
      ...prev,
      { id: values.icon.name, name: values.name, icon: values.icon },
    ]);
  };

  const handleDelete = (category: Category) => {
    setCategories((prev) => prev.filter((c) => c.id !== category.id));
    setItems((prev) =>
      prev.map((item) =>
        item.categoryId === category.id ? { ...item, categoryId: null } : item,
      ),
    );
    if (editingCategory?.id === category.id) {
      setEditingCategory(null);
    }
    if (editingItem?.categoryId === category.id) {
      setEditingItem(null);
    }
  };

  const requestDeleteCategory = (category: Category) => {
    setConfirmDeleteCategory(category);
  };

  const handleItemSubmit: React.ComponentProps<typeof ItemForm>["onSubmit"] = (
    values,
  ) => {
    const categoryId = values.categoryId === "" ? null : values.categoryId;
    const categoryName =
      categories.find((c) => c.id === categoryId)?.name ?? "Reminder";
    const trimmed = values.text.trim();

    // prevent duplicate item texts (case-insensitive)
    const duplicate = (items || []).some(
      (it) =>
        it.text.trim().toLowerCase() === trimmed.toLowerCase() &&
        it.id !== editingItem?.id,
    );
    if (duplicate) {
      setNotification("An item with this text already exists.");
      return;
    }

    if (editingItem) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? { ...item, categoryId, text: values.text }
            : item,
        ),
      );
      setEditingItem(null);
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        categoryId,
        text: values.text,
        createdAt: Math.floor(Date.now() / 1000),
        hasNotification: true,
      },
    ]);
    setNotification(`${categoryName}: ${values.text}`);
    showAppNotification(categoryName, values.text);
  };

  const handleItemCopy = (item: Item) => {
    navigator.clipboard.writeText(item.text);
    setNotification(`Item Copied`);
  };

  const handleItemDelete = (item: Item) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    if (editingItem?.id === item.id) {
      setEditingItem(null);
    }
  };

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedItemIds(new Set());
  };

  const toggleItemSelected = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = () => {
    setItems((prev) => prev.filter((item) => !selectedItemIds.has(item.id)));
    setSelectedItemIds(new Set());
    setConfirmBulkDeleteOpen(false);
  };

  const handleBulkCategoryChange = (categoryId: string | null) => {
    setItems((prev) =>
      prev.map((item) =>
        selectedItemIds.has(item.id) ? { ...item, categoryId } : item,
      ),
    );
    setSelectedItemIds(new Set());
    setBulkCategoryAnchor(null);
  };

  return (
    <Box sx={{ margin: 1 }}>
      <Paper sx={{ p: 2 }}>
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Tabs
            value={activeTab}
            onChange={(_event, newValue) => {
              const normalized =
                newValue === "items" ||
                newValue === "categories" ||
                newValue === "utils"
                  ? newValue
                  : (String(newValue) as TabValue);
              setActiveTab(normalized);
            }}
          >
            {storageReady ? (
              [
                <Tab
                  value="items"
                  label="Notes"
                  id="tab-items"
                  aria-controls="tabpanel-items"
                />,
                <Tab
                  value="categories"
                  label="Groups"
                  id="tab-categories"
                  aria-controls="tabpanel-categories"
                />,
                <Tab
                  value="utils"
                  label="Data"
                  id="tab-utils"
                  aria-controls="tabpanel-utils"
                />,
              ]
            ) : (
              <Tab
                value="utils"
                label="Utils"
                id="tab-utils"
                aria-controls="tabpanel-utils"
              />
            )}
          </Tabs>
          {activeTab === "items" && (
            <Stack direction="row" sx={{ alignItems: "center" }}>
              {selectMode && selectedItemIds.size > 0 && (
                <>
                  <Tooltip title="Change category">
                    <IconButton
                      aria-label="Change category for selected items"
                      onClick={(event) =>
                        setBulkCategoryAnchor(event.currentTarget)
                      }
                    >
                      <Icon path={mdiFolderMoveOutline} size={0.9} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete selected">
                    <IconButton
                      aria-label="Delete selected items"
                      onClick={() => setConfirmBulkDeleteOpen(true)}
                    >
                      <Icon path={mdiTrashCanOutline} size={0.9} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              <Tooltip
                title={
                  selectMode ? "Exit select mode" : "Select multiple items"
                }
              >
                <IconButton
                  aria-label="Toggle select mode"
                  color={selectMode ? "primary" : "default"}
                  onClick={toggleSelectMode}
                >
                  <Icon path={mdiCheckboxMultipleMarkedOutline} size={0.9} />
                </IconButton>
              </Tooltip>
              <ItemFilters
                categories={categories}
                filters={itemFilters}
                onChange={setItemFilters}
              />
            </Stack>
          )}
        </Stack>
        <Box sx={{ pt: 3 }}>
          <TabPanel value={activeTab} index="items">
            <Stack spacing={3}>
              <ItemForm
                editingItem={editingItem}
                onSubmit={handleItemSubmit}
                onCancelEdit={() => setEditingItem(null)}
              />
              <ItemList
                items={items}
                categories={categories}
                filters={itemFilters}
                onEdit={setEditingItem}
                onDelete={handleItemDelete}
                onCopy={handleItemCopy}
                onNotify={(item) => {
                  const categoryName =
                    categories.find((c) => c.id === item.categoryId)?.name ??
                    "Reminder";
                  // mark item as having an active notification
                  setItems((prev) =>
                    prev.map((existingItem) =>
                      existingItem.id === item.id
                        ? { ...existingItem, hasNotification: true }
                        : existingItem,
                    ),
                  );
                  setNotification(`${categoryName}: ${item.text}`);
                  showAppNotification(categoryName, item.text);
                }}
                onCategoryChange={(item, categoryId) => {
                  setItems((prev) =>
                    prev.map((existingItem) =>
                      existingItem.id === item.id
                        ? { ...existingItem, categoryId }
                        : existingItem,
                    ),
                  );
                  if (editingItem?.id === item.id) {
                    setEditingItem({ ...editingItem, categoryId });
                  }
                }}
                selectMode={selectMode}
                selectedIds={selectedItemIds}
                onToggleSelect={toggleItemSelected}
              />
            </Stack>
          </TabPanel>
          <TabPanel value={activeTab} index="categories">
            <Stack spacing={3}>
              <CategoryForm
                editingCategory={editingCategory}
                onSubmit={handleSubmit}
                onCancelEdit={() => setEditingCategory(null)}
              />
              <CategoryList
                categories={categories}
                onEdit={setEditingCategory}
                onDelete={requestDeleteCategory}
              />
            </Stack>
          </TabPanel>
          <TabPanel value={activeTab} index="utils">
            <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleOpenStorageFile}
              >
                Import JSON
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleExportJson}
              >
                Export JSON
              </Button>
            </Stack>
          </TabPanel>
        </Box>
      </Paper>
      <Snackbar
        open={!!notification}
        autoHideDuration={3000}
        onClose={() => setNotification(null)}
        message={notification}
      />
      <Dialog
        open={confirmBulkDeleteOpen}
        onClose={() => setConfirmBulkDeleteOpen(false)}
      >
        <DialogTitle>Delete {selectedItemIds.size} item(s)?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete the selected items. This action cannot
            be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmBulkDeleteOpen(false)}>
            Cancel
          </Button>
          <Button color="error" onClick={handleBulkDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={!!confirmDeleteCategory}
        onClose={() => setConfirmDeleteCategory(null)}
      >
        <DialogTitle>
          {`Delete group "${confirmDeleteCategory?.name ?? ""}"?`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Deleting this group will remove it and set any items in this group
            to have no group. This action cannot be undone. Are you sure you
            want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteCategory(null)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              if (confirmDeleteCategory) {
                handleDelete(confirmDeleteCategory);
              }
              setConfirmDeleteCategory(null);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <Menu
        anchorEl={bulkCategoryAnchor}
        open={!!bulkCategoryAnchor}
        onClose={() => setBulkCategoryAnchor(null)}
      >
        <MenuItem onClick={() => handleBulkCategoryChange(null)}>
          No category
        </MenuItem>
        {categories.map((category) => (
          <MenuItem
            key={category.id}
            onClick={() => handleBulkCategoryChange(category.id)}
          >
            <Box
              component="span"
              sx={{ display: "inline-flex", alignItems: "center", mr: 1 }}
            >
              <Icon path={category.icon.path} size={0.8} />
            </Box>
            {category.name}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}

export default App;
