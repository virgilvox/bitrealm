import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Asset, AssetType } from '@/types';

interface AssetState {
  assets: Asset[];
  loading: boolean;
  error: string | null;
  filter: {
    type: AssetType | null;
    tags: string[];
    search: string;
  };
  uploadProgress: number;
  isUploading: boolean;
}

const initialState: AssetState = {
  assets: [],
  loading: false,
  error: null,
  filter: {
    type: null,
    tags: [],
    search: '',
  },
  uploadProgress: 0,
  isUploading: false,
};

const assetSlice = createSlice({
  name: 'assets',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setAssets: (state, action: PayloadAction<Asset[]>) => {
      state.assets = action.payload;
    },
    addAsset: (state, action: PayloadAction<Asset>) => {
      state.assets.push(action.payload);
    },
    updateAsset: (state, action: PayloadAction<Asset>) => {
      const index = state.assets.findIndex(a => a.id === action.payload.id);
      if (index !== -1) {
        state.assets[index] = action.payload;
      }
    },
    deleteAsset: (state, action: PayloadAction<string>) => {
      state.assets = state.assets.filter(a => a.id !== action.payload);
    },
    setFilter: (state, action: PayloadAction<Partial<AssetState['filter']>>) => {
      state.filter = { ...state.filter, ...action.payload };
    },
    clearFilter: (state) => {
      state.filter = {
        type: null,
        tags: [],
        search: '',
      };
    },
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
    setIsUploading: (state, action: PayloadAction<boolean>) => {
      state.isUploading = action.payload;
      if (!action.payload) {
        state.uploadProgress = 0;
      }
    },
  },
});

export const {
  setLoading,
  setError,
  setAssets,
  addAsset,
  updateAsset,
  deleteAsset,
  setFilter,
  clearFilter,
  setUploadProgress,
  setIsUploading,
} = assetSlice.actions;

export default assetSlice.reducer;