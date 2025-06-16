import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Project, GameMap, Character, Item, Quest } from '@/types';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
  isDirty: boolean;
  lastSaved: Date | null;
}

const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  isDirty: false,
  lastSaved: null,
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setProjects: (state, action: PayloadAction<Project[]>) => {
      state.projects = action.payload;
    },
    addProject: (state, action: PayloadAction<Project>) => {
      state.projects.push(action.payload);
    },
    updateProject: (state, action: PayloadAction<Project>) => {
      const index = state.projects.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.projects[index] = action.payload;
      }
      if (state.currentProject?.id === action.payload.id) {
        state.currentProject = action.payload;
      }
    },
    deleteProject: (state, action: PayloadAction<string>) => {
      state.projects = state.projects.filter(p => p.id !== action.payload);
      if (state.currentProject?.id === action.payload) {
        state.currentProject = null;
      }
    },
    setCurrentProject: (state, action: PayloadAction<Project | null>) => {
      state.currentProject = action.payload;
      state.isDirty = false;
      state.lastSaved = action.payload ? new Date() : null;
    },
    markDirty: (state) => {
      state.isDirty = true;
    },
    markSaved: (state) => {
      state.isDirty = false;
      state.lastSaved = new Date();
    },
    // Map operations
    addMap: (state, action: PayloadAction<GameMap>) => {
      if (state.currentProject) {
        state.currentProject.maps.push(action.payload);
        state.isDirty = true;
      }
    },
    updateMap: (state, action: PayloadAction<GameMap>) => {
      if (state.currentProject) {
        const index = state.currentProject.maps.findIndex(m => m.id === action.payload.id);
        if (index !== -1) {
          state.currentProject.maps[index] = action.payload;
          state.isDirty = true;
        }
      }
    },
    deleteMap: (state, action: PayloadAction<string>) => {
      if (state.currentProject) {
        state.currentProject.maps = state.currentProject.maps.filter(m => m.id !== action.payload);
        state.isDirty = true;
      }
    },
    // Character operations
    addCharacter: (state, action: PayloadAction<Character>) => {
      if (state.currentProject) {
        state.currentProject.characters.push(action.payload);
        state.isDirty = true;
      }
    },
    updateCharacter: (state, action: PayloadAction<Character>) => {
      if (state.currentProject) {
        const index = state.currentProject.characters.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.currentProject.characters[index] = action.payload;
          state.isDirty = true;
        }
      }
    },
    deleteCharacter: (state, action: PayloadAction<string>) => {
      if (state.currentProject) {
        state.currentProject.characters = state.currentProject.characters.filter(c => c.id !== action.payload);
        state.isDirty = true;
      }
    },
    // Item operations
    addItem: (state, action: PayloadAction<Item>) => {
      if (state.currentProject) {
        state.currentProject.items.push(action.payload);
        state.isDirty = true;
      }
    },
    updateItem: (state, action: PayloadAction<Item>) => {
      if (state.currentProject) {
        const index = state.currentProject.items.findIndex(i => i.id === action.payload.id);
        if (index !== -1) {
          state.currentProject.items[index] = action.payload;
          state.isDirty = true;
        }
      }
    },
    deleteItem: (state, action: PayloadAction<string>) => {
      if (state.currentProject) {
        state.currentProject.items = state.currentProject.items.filter(i => i.id !== action.payload);
        state.isDirty = true;
      }
    },
    // Quest operations
    addQuest: (state, action: PayloadAction<Quest>) => {
      if (state.currentProject) {
        state.currentProject.quests.push(action.payload);
        state.isDirty = true;
      }
    },
    updateQuest: (state, action: PayloadAction<Quest>) => {
      if (state.currentProject) {
        const index = state.currentProject.quests.findIndex(q => q.id === action.payload.id);
        if (index !== -1) {
          state.currentProject.quests[index] = action.payload;
          state.isDirty = true;
        }
      }
    },
    deleteQuest: (state, action: PayloadAction<string>) => {
      if (state.currentProject) {
        state.currentProject.quests = state.currentProject.quests.filter(q => q.id !== action.payload);
        state.isDirty = true;
      }
    },
    // Project settings
    updateProjectSettings: (state, action: PayloadAction<Partial<any>>) => {
      if (state.currentProject) {
        state.currentProject.settings = { ...state.currentProject.settings, ...action.payload };
        state.isDirty = true;
      }
    },
  },
});

export const {
  setLoading,
  setError,
  setProjects,
  addProject,
  updateProject,
  deleteProject,
  setCurrentProject,
  markDirty,
  markSaved,
  addMap,
  updateMap,
  deleteMap,
  addCharacter,
  updateCharacter,
  deleteCharacter,
  addItem,
  updateItem,
  deleteItem,
  addQuest,
  updateQuest,
  deleteQuest,
  updateProjectSettings,
} = projectSlice.actions;

export default projectSlice.reducer;