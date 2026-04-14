import { useState, useCallback } from 'react';

const STORAGE_KEY = 'cms_onboarding';
const TIPS_KEY = 'cms_dismissed_tips';

interface OnboardingItem {
  id: string;
  label: string;
  checked: boolean;
}

interface OnboardingState {
  items: OnboardingItem[];
  completedAt: string | null;
  firstVisit: boolean;
}

function loadState(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { items: [], completedAt: null, firstVisit: true };
}

function saveState(state: OnboardingState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function useOnboarding(defaultItems: Array<{ id: string; label: string }>) {
  const [state, setState] = useState<OnboardingState>(() => {
    const saved = loadState();
    if (saved.items.length > 0) return saved;
    return {
      items: defaultItems.map((item) => ({ ...item, checked: false })),
      completedAt: null,
      firstVisit: true,
    };
  });

  const toggleItem = useCallback((id: string) => {
    setState((prev) => {
      const items = prev.items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      );
      const allDone = items.every((item) => item.checked);
      const next = {
        ...prev,
        items,
        completedAt: allDone ? new Date().toISOString() : null,
      };
      saveState(next);
      return next;
    });
  }, []);

  const dismiss = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, firstVisit: false };
      saveState(next);
      return next;
    });
  }, []);

  const progress = state.items.length > 0
    ? state.items.filter((i) => i.checked).length / state.items.length
    : 0;

  const showChecklist = state.firstVisit && !state.completedAt;

  return { items: state.items, toggleItem, dismiss, progress, showChecklist };
}

export function useDismissedTip(tipId: string) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      const tips = JSON.parse(localStorage.getItem(TIPS_KEY) || '[]');
      return tips.includes(tipId);
    } catch {
      return false;
    }
  });

  const dismissTip = useCallback(() => {
    setDismissed(true);
    try {
      const tips = JSON.parse(localStorage.getItem(TIPS_KEY) || '[]');
      if (!tips.includes(tipId)) {
        tips.push(tipId);
        localStorage.setItem(TIPS_KEY, JSON.stringify(tips));
      }
    } catch {}
  }, [tipId]);

  return { dismissed, dismissTip };
}
