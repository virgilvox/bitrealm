// Core game object types
export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds extends Position, Size {}

// Asset types
export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  url: string;
  metadata: AssetMetadata;
  tags: string[];
  license: LicenseInfo;
}

export enum AssetType {
  SPRITE = 'sprite',
  TILESET = 'tileset',
  AUDIO = 'audio',
  ANIMATION = 'animation',
  PARTICLE = 'particle',
  SCRIPT = 'script',
}

export interface AssetMetadata {
  width?: number;
  height?: number;
  frameCount?: number;
  duration?: number;
  fileSize: number;
  uploadedAt: Date;
  createdBy: string;
}

export interface LicenseInfo {
  type: 'CC0' | 'CC-BY' | 'CC-BY-SA' | 'MIT' | 'GPL' | 'Custom';
  attribution?: string;
  url?: string;
}

// Map and world types
export interface Tile {
  id: string;
  x: number;
  y: number;
  layer: number;
  spriteId: string;
  collision: boolean;
  properties: Record<string, any>;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  tiles: Tile[];
  type: 'tile' | 'object' | 'collision';
}

export interface GameMap {
  id: string;
  name: string;
  width: number;
  height: number;
  tileSize: number;
  layers: Layer[];
  properties: Record<string, any>;
  spawnPoints: SpawnPoint[];
}

export interface SpawnPoint extends Position {
  id: string;
  name: string;
  type: 'player' | 'npc' | 'item';
}

// Character and NPC types
export interface Character {
  id: string;
  name: string;
  type: 'player' | 'npc';
  spriteId: string;
  position: Position;
  stats: CharacterStats;
  equipment: Equipment;
  inventory: InventoryItem[];
  skills: Skill[];
  dialogue?: DialogueTree;
}

export interface CharacterStats {
  level: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  constitution: number;
  experience: number;
  experienceToNext: number;
}

export interface Equipment {
  weapon?: Item;
  armor?: Item;
  helmet?: Item;
  boots?: Item;
  accessory?: Item;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  spriteId: string;
  stats: ItemStats;
  requirements: ItemRequirements;
  value: number;
}

export enum ItemType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  CONSUMABLE = 'consumable',
  QUEST = 'quest',
  MISC = 'misc',
}

export enum ItemRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

export interface ItemStats {
  damage?: number;
  defense?: number;
  healing?: number;
  manaRestore?: number;
  statBonus?: Partial<CharacterStats>;
}

export interface ItemRequirements {
  level?: number;
  strength?: number;
  dexterity?: number;
  intelligence?: number;
  constitution?: number;
}

export interface InventoryItem {
  item: Item;
  quantity: number;
  slot: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  type: SkillType;
  cooldown: number;
  manaCost: number;
  effects: SkillEffect[];
}

export enum SkillType {
  COMBAT = 'combat',
  MAGIC = 'magic',
  CRAFTING = 'crafting',
  PASSIVE = 'passive',
}

export interface SkillEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff';
  value: number;
  duration?: number;
  target: 'self' | 'enemy' | 'ally' | 'area';
}

// Dialogue system
export interface DialogueTree {
  id: string;
  nodes: DialogueNode[];
  variables: Record<string, any>;
}

export interface DialogueNode {
  id: string;
  text: string;
  speaker: string;
  choices: DialogueChoice[];
  conditions?: DialogueCondition[];
  actions?: DialogueAction[];
}

export interface DialogueChoice {
  id: string;
  text: string;
  nextNodeId: string;
  conditions?: DialogueCondition[];
}

export interface DialogueCondition {
  type: 'variable' | 'item' | 'level' | 'quest';
  key: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: any;
}

export interface DialogueAction {
  type: 'setVariable' | 'giveItem' | 'giveExp' | 'startQuest' | 'completeQuest';
  key: string;
  value: any;
}

// Quest system
export interface Quest {
  id: string;
  name: string;
  description: string;
  type: QuestType;
  status: QuestStatus;
  objectives: QuestObjective[];
  rewards: QuestReward[];
  prerequisites: QuestPrerequisite[];
}

export enum QuestType {
  MAIN = 'main',
  SIDE = 'side',
  DAILY = 'daily',
  ACHIEVEMENT = 'achievement',
}

export enum QuestStatus {
  AVAILABLE = 'available',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface QuestObjective {
  id: string;
  description: string;
  type: 'kill' | 'collect' | 'talk' | 'reach' | 'craft';
  target: string;
  current: number;
  required: number;
  completed: boolean;
}

export interface QuestReward {
  type: 'experience' | 'gold' | 'item';
  value: number;
  itemId?: string;
}

export interface QuestPrerequisite {
  type: 'quest' | 'level' | 'item';
  value: string | number;
}

// Project and editor types
export interface Project {
  id: string;
  name: string;
  description: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  settings: ProjectSettings;
  maps: GameMap[];
  characters: Character[];
  items: Item[];
  quests: Quest[];
  assets: Asset[];
  plugins: Plugin[];
}

export interface ProjectSettings {
  title: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  isPublic: boolean;
  resolution: Size;
  targetFrameRate: number;
  enablePhysics: boolean;
  enableAudio: boolean;
  enableNetworking: boolean;
}

// Plugin system
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  config: Record<string, any>;
  hooks: PluginHook[];
  components: PluginComponent[];
}

export interface PluginHook {
  event: string;
  handler: string;
  priority: number;
}

export interface PluginComponent {
  id: string;
  name: string;
  type: 'editor' | 'runtime' | 'export';
  component: string;
}

// Editor state types
export interface EditorState {
  currentProject: Project | null;
  activeMap: string | null;
  selectedTool: EditorTool;
  selectedLayer: string | null;
  selectedAsset: string | null;
  viewport: Viewport;
  history: HistoryState;
  collaboration: CollaborationState;
}

export enum EditorTool {
  SELECT = 'select',
  PAINT = 'paint',
  ERASE = 'erase',
  FILL = 'fill',
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  LINE = 'line',
  TEXT = 'text',
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

export interface HistoryState {
  past: any[];
  present: any;
  future: any[];
  canUndo: boolean;
  canRedo: boolean;
}

export interface CollaborationState {
  connected: boolean;
  users: CollaborationUser[];
  cursors: Record<string, Position>;
}

export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  cursor: Position;
  selection: any;
}

// API types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Export types
export interface ExportConfig {
  format: ExportFormat;
  includeAssets: boolean;
  minify: boolean;
  target: ExportTarget;
  customSettings: Record<string, any>;
}

export enum ExportFormat {
  HTML5 = 'html5',
  STANDALONE = 'standalone',
  MOBILE = 'mobile',
  JSON = 'json',
}

export enum ExportTarget {
  WEB = 'web',
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  DATA = 'data',
}