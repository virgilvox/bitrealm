import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CollaborationUser, Position } from '@/types';

interface CollaborationState {
  connected: boolean;
  users: CollaborationUser[];
  cursors: Record<string, Position>;
  activeSelections: Record<string, any>;
  roomId: string | null;
  isHost: boolean;
}

const initialState: CollaborationState = {
  connected: false,
  users: [],
  cursors: {},
  activeSelections: {},
  roomId: null,
  isHost: false,
};

const collaborationSlice = createSlice({
  name: 'collaboration',
  initialState,
  reducers: {
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;
    },
    setRoomId: (state, action: PayloadAction<string | null>) => {
      state.roomId = action.payload;
    },
    setIsHost: (state, action: PayloadAction<boolean>) => {
      state.isHost = action.payload;
    },
    setUsers: (state, action: PayloadAction<CollaborationUser[]>) => {
      state.users = action.payload;
    },
    addUser: (state, action: PayloadAction<CollaborationUser>) => {
      state.users.push(action.payload);
    },
    removeUser: (state, action: PayloadAction<string>) => {
      state.users = state.users.filter(user => user.id !== action.payload);
      delete state.cursors[action.payload];
      delete state.activeSelections[action.payload];
    },
    updateUserCursor: (state, action: PayloadAction<{ userId: string; position: Position }>) => {
      state.cursors[action.payload.userId] = action.payload.position;
    },
    updateUserSelection: (state, action: PayloadAction<{ userId: string; selection: any }>) => {
      state.activeSelections[action.payload.userId] = action.payload.selection;
    },
    clearUserSelection: (state, action: PayloadAction<string>) => {
      delete state.activeSelections[action.payload];
    },
    disconnect: (state) => {
      state.connected = false;
      state.users = [];
      state.cursors = {};
      state.activeSelections = {};
      state.roomId = null;
      state.isHost = false;
    },
  },
});

export const {
  setConnected,
  setRoomId,
  setIsHost,
  setUsers,
  addUser,
  removeUser,
  updateUserCursor,
  updateUserSelection,
  clearUserSelection,
  disconnect,
} = collaborationSlice.actions;

export default collaborationSlice.reducer;