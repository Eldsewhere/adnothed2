import { useEffect, useState } from 'react';
import { Box, Button, Container, Divider, Paper, Snackbar, Stack, Tab, Tabs } from '@mui/material';
import CategoryForm from './components/CategoryForm';
import CategoryList from './components/CategoryList';
import ItemForm from './components/ItemForm';
import ItemList from './components/ItemList';
import TabPanel from './components/TabPanel';
import type { Category, Item } from './types';
import { clearPersistedState, loadPersistedState, savePersistedState } from './utils/storage';
import { requestNotificationPermission, showAppNotification } from './utils/notifications';

const persistedState = loadPersistedState();

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [categories, setCategories] = useState<Category[]>(persistedState.categories);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<Item[]>(persistedState.items);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    savePersistedState({ categories, items });
  }, [categories, items]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const handleClearStorage = () => {
    clearPersistedState();
    setCategories([]);
    setItems([]);
    setEditingCategory(null);
    setEditingItem(null);
  };

  const handleSubmit: React.ComponentProps<typeof CategoryForm>['onSubmit'] = (values) => {
    if (editingCategory) {
      setCategories((prev) =>
        prev.map((category) =>
          category.id === editingCategory.id
            ? { ...category, name: values.name, icon: values.icon }
            : category,
        ),
      );
      setEditingCategory(null);
      return;
    }

    setCategories((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: values.name, icon: values.icon },
    ]);
  };

  const handleDelete = (category: Category) => {
    setCategories((prev) => prev.filter((c) => c.id !== category.id));
    setItems((prev) => prev.filter((item) => item.categoryId !== category.id));
    if (editingCategory?.id === category.id) {
      setEditingCategory(null);
    }
    if (editingItem?.categoryId === category.id) {
      setEditingItem(null);
    }
  };

  const handleItemSubmit: React.ComponentProps<typeof ItemForm>['onSubmit'] = (values) => {
    const categoryId = values.categoryId === '' ? null : values.categoryId;

    if (editingItem) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id ? { ...item, categoryId, text: values.text } : item,
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
        createdAt: Date.now(),
      },
    ]);
    setNotification(`Item added: ${values.text}`);
    showAppNotification('Item added', values.text);
  };

  const handleItemCopy = (item: Item) => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        categoryId: item.categoryId,
        text: item.text,
        createdAt: Date.now(),
      },
    ]);
    setNotification(`Item added: ${item.text}`);
    showAppNotification('Item added', item.text);
  };

  const handleItemDelete = (item: Item) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    if (editingItem?.id === item.id) {
      setEditingItem(null);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 1 }}>
          <Button color="error" variant="outlined" size="small" onClick={handleClearStorage}>
            Clear local storage
          </Button>
        </Stack>
        <Tabs value={activeTab} onChange={(_event, newValue) => setActiveTab(newValue)}>
          <Tab label="Items" id="tab-0" aria-controls="tabpanel-0" />
          <Tab label="Categories" id="tab-1" aria-controls="tabpanel-1" />
        </Tabs>
        <Box sx={{ pt: 3 }}>
          <TabPanel value={activeTab} index={0}>
            <Stack spacing={3}>
              <ItemForm
                categories={categories}
                editingItem={editingItem}
                onSubmit={handleItemSubmit}
                onCancelEdit={() => setEditingItem(null)}
              />
              <Divider />
              <ItemList
                items={items}
                categories={categories}
                onEdit={setEditingItem}
                onDelete={handleItemDelete}
                onCopy={handleItemCopy}
              />
            </Stack>
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            <Stack spacing={3}>
              <CategoryForm
                editingCategory={editingCategory}
                onSubmit={handleSubmit}
                onCancelEdit={() => setEditingCategory(null)}
              />
              <Divider />
              <CategoryList
                categories={categories}
                onEdit={setEditingCategory}
                onDelete={handleDelete}
              />
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
    </Container>
  );
}

export default App;
