const exercise = (id, name, sets, reps, station, alternatives = []) => ({
  type: 'exercise',
  id,
  name,
  sets,
  reps,
  rir: '1–2',
  station,
  alternatives,
});
const superset = (id, label, station, members) => ({
  type: 'superset',
  id,
  label,
  station,
  members,
});
const block = (id, label, station, items) => ({
  type: 'equipmentBlock',
  id,
  label,
  station,
  items,
});
const E = {
  press: exercise(
    'high-incline-machine-press',
    'High-Incline Machine Press',
    3,
    '6–10',
    'high-incline-machine',
    ['Incline Dumbbell Press', 'Smith Incline Press'],
  ),
  neutralPulldown: exercise(
    'neutral-grip-pulldown',
    'Neutral-Grip Pulldown',
    3,
    '6–10',
    'pulldown-station',
    ['Lat Pulldown', 'Pull-Up'],
  ),
  lateral: exercise('cable-lateral-raise', 'Cable Lateral Raise', 3, '10–20', 'cable-station', [
    'Machine Lateral Raise',
    'Dumbbell Lateral Raise',
  ]),
  row: exercise('braced-cable-row', 'Braced Cable Row', 2, '8–12', 'cable-station', [
    'Chest-Supported Row',
    'Machine Row',
    'Seated Cable Row',
  ]),
  tricep: exercise(
    'overhead-tricep-extension',
    'Overhead Tricep Extension',
    2,
    '8–15',
    'cable-station',
    ['Cable Pushdown'],
  ),
  curl: exercise('cable-curl', 'Cable Curl', 2, '8–15', 'cable-station'),
  legPress: exercise('leg-press', 'Leg Press', 3, '6–10', 'leg-press'),
  legCurl: exercise('leg-curl', 'Leg Curl', 3, '8–12', 'leg-curl'),
  legExtension: exercise('leg-extension', 'Leg Extension', 2, '10–15', 'leg-extension'),
  calf: exercise('standing-calf-raise', 'Standing Calf Raise', 3, '8–15', 'calf-raise'),
  neckFront: exercise('neck-iso-front', 'Neck Iso Front', 2, '10–20', 'neck-setup'),
  neckBack: exercise('neck-iso-back', 'Neck Iso Back', 2, '10–20', 'neck-setup'),
  inclineDumbbell: exercise(
    'incline-dumbbell-press',
    'Incline Dumbbell Press',
    3,
    '6–10',
    'dumbbells',
  ),
  latPulldown: exercise('lat-pulldown', 'Lat Pulldown', 3, '8–12', 'pulldown-station'),
  pecDeck: exercise('pec-deck', 'Pec Deck', 2, '10–15', 'pec-deck'),
  reversePec: exercise('reverse-pec-deck', 'Reverse Pec Deck', 3, '10–20', 'reverse-pec-deck'),
  preacher: exercise('preacher-curl', 'Preacher Curl', 2, '8–15', 'preacher'),
  fly: exercise('cable-fly', 'Cable Fly', 2, '10–15', 'cable-station'),
  straightPulldown: exercise(
    'straight-arm-pulldown',
    'Straight-Arm Pulldown',
    2,
    '10–15',
    'cable-station',
  ),
  pushdown: exercise('cable-tricep-pushdown', 'Cable Tricep Pushdown', 2, '8–15', 'cable-station'),
  hammer: exercise('hammer-curl', 'Hammer Curl', 2, '8–15', 'dumbbells'),
  shrug: exercise('dumbbell-shrug', 'Dumbbell Shrug', 3, '8–15', 'dumbbells'),
  wrist: exercise('dumbbell-wrist-extension', 'Dumbbell Wrist Extension', 2, '12–20', 'dumbbells'),
};
export const ROUTINE = {
  Monday: [
    E.press,
    E.neutralPulldown,
    E.lateral,
    E.row,
    superset('upper-a-arms', 'Cable arm superset', 'cable-station', [E.tricep, E.curl]),
  ],
  Tuesday: [
    E.legPress,
    E.legCurl,
    E.legExtension,
    E.calf,
    E.lateral,
    superset('neck-superset', 'Neck superset', 'neck-setup', [E.neckFront, E.neckBack]),
  ],
  Wednesday: null,
  Thursday: [
    E.latPulldown,
    E.pecDeck,
    E.reversePec,
    E.preacher,
    E.row,
    E.tricep,
    E.inclineDumbbell,
  ],
  Friday: [
    E.reversePec,
    block('cable-block', 'Cable equipment block', 'cable-station', [
      E.lateral,
      E.fly,
      E.straightPulldown,
      E.pushdown,
    ]),
    block('dumbbell-block', 'Dumbbell equipment block', 'dumbbells', [E.hammer, E.shrug, E.wrist]),
  ],
  Saturday: null,
  Sunday: null,
};
export const NAMES = {
  Monday: 'UPPER A',
  Tuesday: 'LOWER + AESTHETIC',
  Thursday: 'UPPER B',
  Friday: 'AESTHETIC',
};

export const isExerciseDefinition = (item) =>
  Boolean(
    item &&
    item.type === 'exercise' &&
    typeof item.id === 'string' &&
    item.id &&
    typeof item.name === 'string' &&
    item.name &&
    Number.isInteger(item.sets) &&
    item.sets > 0,
  );
const groupMembers = (item) =>
  item?.type === 'superset' ? item.members : item?.type === 'equipmentBlock' ? item.items : null;

export const dayItems = (day) => (Array.isArray(ROUTINE[day]) ? ROUTINE[day] : []);
export const isWorkoutDay = (day) =>
  dayItems(day).some(
    (item) =>
      isExerciseDefinition(item) ||
      (Array.isArray(groupMembers(item)) && groupMembers(item).some(isExerciseDefinition)),
  );
export const workoutName = (day) =>
  typeof NAMES[day] === 'string' && NAMES[day].trim() ? NAMES[day] : day;
export const configuredDays = () => Object.keys(ROUTINE);
