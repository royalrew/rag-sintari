/**
 * History API
 * Handles saving and loading chat history from localStorage
 */

import { HistoryItem } from '@/lib/mockData';

const HISTORY_KEY = 'dokument-ai-history';

const loadAll = (): HistoryItem[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load history:', err);
    return [];
  }
};

const saveAll = (items: HistoryItem[]) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save history:', err);
  }
};

/**
 * Get chat history from localStorage
 */
export const getChatHistory = async (): Promise<HistoryItem[]> => {
  return loadAll();
};

/**
 * Save a history item to localStorage
 */
export const saveHistoryItem = async (item: HistoryItem): Promise<void> => {
  const list = loadAll();
  const updated = [item, ...list];
  saveAll(updated);
};

/**
 * Update a history item by ID
 */
export const updateHistoryItem = async (
  id: string,
  patch: Partial<HistoryItem>
): Promise<HistoryItem | null> => {
  const list = loadAll();
  const idx = list.findIndex((h) => h.id === id);
  if (idx === -1) return null;

  const updatedItem = { ...list[idx], ...patch };
  const updatedList = [...list];
  updatedList[idx] = updatedItem;
  saveAll(updatedList);
  return updatedItem;
};

/**
 * Toggle favorite status of a history item
 */
export const toggleFavoriteHistoryItem = async (
  id: string
): Promise<HistoryItem | null> => {
  const list = loadAll();
  const idx = list.findIndex((h) => h.id === id);
  if (idx === -1) return null;

  const current = list[idx];
  const updatedItem: HistoryItem = {
    ...current,
    isFavorite: !current.isFavorite,
  };
  const updatedList = [...list];
  updatedList[idx] = updatedItem;
  saveAll(updatedList);
  return updatedItem;
};

/**
 * Delete a history item by ID
 */
export const deleteHistoryItem = async (id: string): Promise<void> => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return;
    const list: HistoryItem[] = JSON.parse(raw);
    const updated = list.filter(item => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete history item:', err);
    throw err;
  }
};

