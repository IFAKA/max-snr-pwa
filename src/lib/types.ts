export type MuscleMap = Record<string, number>;
export type Unit = 'kg' | 'lb';
export type Phase = 'warmup' | 'plank' | 'lifting' | 'rest' | 'stretch' | 'complete';

export interface ExerciseDefinition {
  type: 'exercise';
  id: string;
  name: string;
  sets: number;
  reps: string;
  rir: string;
  station?: string;
  restMs?: number;
  primary?: MuscleMap;
  secondary?: MuscleMap;
  setupSeconds?: number;
  executionSeconds?: number;
  fatigue?: number;
  supersetSafe?: boolean;
  health?: string[];
  alternatives?: string[];
  cutPriority?: number | null;
}

export interface SupersetDefinition {
  type: 'superset';
  id: string;
  label: string;
  station?: string;
  members: ExerciseDefinition[];
}

export interface EquipmentBlockDefinition {
  type: 'equipmentBlock';
  id: string;
  label: string;
  items: ExerciseDefinition[];
}

export type RoutineItem = ExerciseDefinition | SupersetDefinition | EquipmentBlockDefinition;
export type RoutineDay = RoutineItem[];

export interface Performance {
  reps: number;
  weight?: number;
  unit?: Unit;
  rir?: string;
  completedAt?: string;
  actualName?: string;
  originalName?: string;
  targetRepRange?: string;
  set?: number;
}

export interface Task {
  id: string;
  exerciseId: string;
  originalName: string;
  performedName: string;
  name?: string;
  sets: number;
  set: number;
  reps: string;
  rir: string;
  targetRepRange?: string;
  targetRir?: string;
  workingSets?: number;
  load?: number | null;
  primary?: MuscleMap;
  secondary?: MuscleMap;
  station?: string;
  alternatives?: string[];
  restMs: number;
  cutPriority?: number | null;
  groupId: string | null;
  groupType: 'exercise' | 'superset' | 'equipmentBlock';
  memberIndex?: number;
  groupLabel?: string;
  completed: Performance | Performance[] | null;
  done?: Performance[];
  skipped?: boolean;
  skipReason?: 'user' | 'time-budget';
}

export interface Draft {
  weight?: string | number;
  reps?: string | number;
  rir?: string;
}

export interface Workout {
  id: number;
  date: string;
  startedAt: number;
  completedAt?: string;
  durationMs?: number;
  day: string;
  name: string;
  tasks: Task[];
  queue?: Task[];
  pos: number;
  phase: Phase;
  deferredGroups: string[];
  supersetLeads: Record<string, number>;
  sessionTargetMs: number;
  sessionCapMs: number;
  completed?: boolean;
}

export interface ActiveWorkout extends Workout {
  draft: Draft;
  restEndsAt: number | null;
  timerEndsAt: number | null;
  nextPos?: number | null;
}

export interface Profile {
  sex: string;
  age: number;
  heightCm: number;
  weightKg: number;
  measurements: Record<string, number>;
}

export interface Recommendation {
  type: string;
  score: number;
  selectedAt?: number;
}

export interface Settings {
  unit: Unit;
  weeklyGoal: number;
  recommendation: Recommendation | null;
  profile: Profile;
}

export interface Activity {
  id: string;
  type: string;
  startedAt?: string;
  completedAt?: string;
  date?: string;
  estimatedMinutes?: number;
  durationMinutes?: number;
  minutes?: number;
  durationMs?: number;
  intensity?: string;
  dimensions?: string[];
  planned?: boolean;
  contextual?: boolean;
  completed?: boolean;
  measurements?: Record<string, number>;
}

export interface MinutesEntry {
  date: string;
  minutes: number;
  intensity?: string;
}

export interface SedentaryLog {
  date: string;
  hours: number;
  longestUninterruptedMinutes: number;
  interruptions: number;
}

export interface Health {
  activities: Activity[];
  movementMinutes: MinutesEntry[];
  cardioMinutes: MinutesEntry[];
  measurements: Array<Record<string, number | string>>;
  sedentary: {
    profileHoursPerDay: number;
    exposureClass: string;
    logs: SedentaryLog[];
    reminders: { enabled: boolean; intervalMinutes: number };
  };
}

export interface PersonalizationAdjustment {
  measure: string;
  exerciseId: string;
  actual: number;
  target: number;
  deficit: number;
  delta: number;
}

export interface PersonalizationPlan {
  key: string | null;
  adjustments: PersonalizationAdjustment[];
}

export interface Prescription {
  version: number;
  programId: string;
  daysPerWeek: number;
  days: string[];
  exercises: Array<{ id: string; name: string }>;
  exerciseIds: string[];
  weeklySetAllocation: Record<string, number>;
  perSessionSetDistribution: Array<Array<{ exerciseId: string; sets: number }>>;
  exerciseOrdering: string[][];
  supersets: Array<{ id: string; members: string[] }>;
  routine: RoutineDay[] | Record<string, RoutineDay | null>;
  names: string[] | Record<string, string>;
  personalization: PersonalizationPlan;
  createdAt: number;
  lastEvaluatedAt: number;
  lastChangeReason: string;
  evidence: unknown;
}

export interface AppState {
  version: 2;
  history: Workout[];
  active: ActiveWorkout | null;
  prescription: Prescription | null;
  settings: Settings;
  health: Health;
  updatedAt: number;
}
