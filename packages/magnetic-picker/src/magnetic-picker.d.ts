export interface MagneticPickerSelection {
  row: Element | null;
  action: HTMLElement | null;
  index: number;
}

export interface MagneticPickerOptions {
  rowSelector?: string;
  actionSelector?: string;
  primarySelector?: string;
  onSelect?: (value: string, selection: MagneticPickerSelection) => void;
  onCancel?: () => void;
  isSelectable?: (action: HTMLElement | null, row?: Element | null) => boolean;
  cancel?: boolean;
  cancelLabel?: string;
  disabled?: boolean | ((list: HTMLElement) => boolean);
  holdMs?: number;
  detentDistance?: number;
  joystick?: boolean;
  joystickRadius?: number;
  joystickDeadZone?: number;
  joystickMaxSpeed?: number;
  activeListClass?: string;
  activeDocumentClass?: string;
  targetRowClass?: string;
  cancelRowClass?: string;
  cancelRowAttribute?: string;
  cancelActionAttribute?: string;
  statusClass?: string;
  statusVisibleClass?: string;
  visuallyHiddenClass?: string;
  holdingClass?: string;
}

export interface MagneticPicker {
  destroy(): void;
}

export function createMagneticPicker(
  list: HTMLElement,
  options?: MagneticPickerOptions,
): MagneticPicker;
export function magneticJoystickSpeed(
  distanceY: number,
  detentDistance?: number,
  deadZone?: number,
  maxSpeed?: number,
  radius?: number,
): number;
export function magneticJoystickVelocity(
  currentVelocity: number,
  targetVelocity: number,
  elapsed: number,
  response?: number,
): number;
export function magneticJoystickEdgeSpeed(
  distanceX: number,
  distanceY: number,
  maxSpeed?: number,
  radius?: number,
): number;
export function magneticRawRowIndex(
  startIndex: number,
  deltaY: number,
  detentDistance?: number,
): number;
export function magneticPickerIndex(rawIndex: number, rowCount: number): number;
export function magneticRowIndex(
  startIndex: number,
  deltaY: number,
  rowCount: number,
  detentDistance?: number,
): number;
export function magneticPreferredIndex(
  rawIndex: number,
  selectableIndices: number[],
  rowCount: number,
): number;
export function magneticEntryIndex(
  rawIndex: number,
  selectableIndices: number[],
  rowCount: number,
  primaryIndices?: number[],
): number;
export function magneticEdgePosition(index: number, rowCount: number, overshoot?: number): number;
