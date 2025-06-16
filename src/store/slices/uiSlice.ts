import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarOpen: boolean;
  sidebarWidth: number;
  activePanel: string;
  panels: {
    assets: boolean;
    layers: boolean;
    properties: boolean;
    minimap: boolean;
    console: boolean;
  };
  modal: {
    isOpen: boolean;
    type: string | null;
    data: any;
  };
  theme: 'light' | 'dark';
  notifications: Notification[];
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

const initialState: UIState = {
  sidebarOpen: true,
  sidebarWidth: 300,
  activePanel: 'assets',
  panels: {
    assets: true,
    layers: true,
    properties: true,
    minimap: false,
    console: false,
  },
  modal: {
    isOpen: false,
    type: null,
    data: null,
  },
  theme: 'dark',
  notifications: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setSidebarWidth: (state, action: PayloadAction<number>) => {
      state.sidebarWidth = Math.max(200, Math.min(600, action.payload));
    },
    setActivePanel: (state, action: PayloadAction<string>) => {
      state.activePanel = action.payload;
    },
    togglePanel: (state, action: PayloadAction<keyof UIState['panels']>) => {
      state.panels[action.payload] = !state.panels[action.payload];
    },
    setPanelOpen: (state, action: PayloadAction<{ panel: keyof UIState['panels']; open: boolean }>) => {
      state.panels[action.payload.panel] = action.payload.open;
    },
    openModal: (state, action: PayloadAction<{ type: string; data?: any }>) => {
      state.modal.isOpen = true;
      state.modal.type = action.payload.type;
      state.modal.data = action.payload.data || null;
    },
    closeModal: (state) => {
      state.modal.isOpen = false;
      state.modal.type = null;
      state.modal.data = null;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date(),
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setSidebarWidth,
  setActivePanel,
  togglePanel,
  setPanelOpen,
  openModal,
  closeModal,
  setTheme,
  addNotification,
  removeNotification,
  clearNotifications,
} = uiSlice.actions;

export default uiSlice.reducer;