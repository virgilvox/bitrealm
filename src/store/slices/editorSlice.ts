import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EditorState, EditorTool, Position, Viewport } from '@/types';

const initialState: EditorState = {
  currentProject: null,
  activeMap: null,
  selectedTool: EditorTool.SELECT,
  selectedLayer: null,
  selectedAsset: null,
  viewport: {
    x: 0,
    y: 0,
    zoom: 1,
    width: 800,
    height: 600,
  },
  history: {
    past: [],
    present: null,
    future: [],
    canUndo: false,
    canRedo: false,
  },
  collaboration: {
    connected: false,
    users: [],
    cursors: {},
  },
};

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    setCurrentProject: (state, action: PayloadAction<any>) => {
      state.currentProject = action.payload;
    },
    setActiveMap: (state, action: PayloadAction<string | null>) => {
      state.activeMap = action.payload;
    },
    setSelectedTool: (state, action: PayloadAction<EditorTool>) => {
      state.selectedTool = action.payload;
    },
    setSelectedLayer: (state, action: PayloadAction<string | null>) => {
      state.selectedLayer = action.payload;
    },
    setSelectedAsset: (state, action: PayloadAction<string | null>) => {
      state.selectedAsset = action.payload;
    },
    updateViewport: (state, action: PayloadAction<Partial<Viewport>>) => {
      state.viewport = { ...state.viewport, ...action.payload };
    },
    setViewportPosition: (state, action: PayloadAction<Position>) => {
      state.viewport.x = action.payload.x;
      state.viewport.y = action.payload.y;
    },
    setViewportZoom: (state, action: PayloadAction<number>) => {
      state.viewport.zoom = Math.max(0.1, Math.min(5, action.payload));
    },
    panViewport: (state, action: PayloadAction<Position>) => {
      state.viewport.x += action.payload.x;
      state.viewport.y += action.payload.y;
    },
    zoomIn: (state) => {
      state.viewport.zoom = Math.min(5, state.viewport.zoom * 1.2);
    },
    zoomOut: (state) => {
      state.viewport.zoom = Math.max(0.1, state.viewport.zoom / 1.2);
    },
    resetZoom: (state) => {
      state.viewport.zoom = 1;
    },
    pushHistory: (state, action: PayloadAction<any>) => {
      state.history.past.push(state.history.present);
      state.history.present = action.payload;
      state.history.future = [];
      state.history.canUndo = true;
      state.history.canRedo = false;
    },
    undo: (state) => {
      if (state.history.past.length > 0) {
        const previous = state.history.past.pop();
        state.history.future.unshift(state.history.present);
        state.history.present = previous;
        state.history.canUndo = state.history.past.length > 0;
        state.history.canRedo = true;
      }
    },
    redo: (state) => {
      if (state.history.future.length > 0) {
        const next = state.history.future.shift();
        state.history.past.push(state.history.present);
        state.history.present = next;
        state.history.canUndo = true;
        state.history.canRedo = state.history.future.length > 0;
      }
    },
    clearHistory: (state) => {
      state.history.past = [];
      state.history.future = [];
      state.history.canUndo = false;
      state.history.canRedo = false;
    },
    setCollaborationConnected: (state, action: PayloadAction<boolean>) => {
      state.collaboration.connected = action.payload;
    },
    updateCollaborationUsers: (state, action: PayloadAction<any[]>) => {
      state.collaboration.users = action.payload;
    },
    updateUserCursor: (state, action: PayloadAction<{ userId: string; position: Position }>) => {
      state.collaboration.cursors[action.payload.userId] = action.payload.position;
    },
    removeUserCursor: (state, action: PayloadAction<string>) => {
      delete state.collaboration.cursors[action.payload];
    },
  },
});

export const {
  setCurrentProject,
  setActiveMap,
  setSelectedTool,
  setSelectedLayer,
  setSelectedAsset,
  updateViewport,
  setViewportPosition,
  setViewportZoom,
  panViewport,
  zoomIn,
  zoomOut,
  resetZoom,
  pushHistory,
  undo,
  redo,
  clearHistory,
  setCollaborationConnected,
  updateCollaborationUsers,
  updateUserCursor,
  removeUserCursor,
} = editorSlice.actions;

export default editorSlice.reducer;