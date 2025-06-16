import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

// Import slices
import editorSlice from './slices/editorSlice';
import projectSlice from './slices/projectSlice';
import assetSlice from './slices/assetSlice';
import collaborationSlice from './slices/collaborationSlice';
import uiSlice from './slices/uiSlice';

const rootReducer = combineReducers({
  editor: editorSlice,
  project: projectSlice,
  assets: assetSlice,
  collaboration: collaborationSlice,
  ui: uiSlice,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredPaths: ['register'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;