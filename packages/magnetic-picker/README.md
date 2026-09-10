# Magnetic Picker

Dependency-free browser ES module that adds long-press, detent-style selection to a vertically scrolling list. It works with plain HTML and framework-managed DOM; create one instance after the list mounts and call `destroy()` before it unmounts.

## Plain HTML and JavaScript

```html
<ul data-magnetic-picker aria-label="Exercises">
  <li data-picker-item data-picker-value="squat">
    <button data-picker-action type="button">Squat</button>
  </li>
  <li data-picker-item data-picker-value="press">
    <button data-picker-action type="button">Press</button>
  </li>
</ul>
```

```js
import { createMagneticPicker } from '@maxsnr/magnetic-picker';
import '@maxsnr/magnetic-picker/styles.css';

const list = document.querySelector('[data-magnetic-picker]');
const picker = createMagneticPicker(list, {
  onSelect(value, { row, action, index }) {
    console.log(value, { row, action, index });
    action.click();
  },
});

// Call this when the list is removed.
picker.destroy();
```

## React

Keep the list markup semantic and create/destroy the picker in an effect. The ref must point to the rendered list element.

```jsx
import { useEffect, useRef } from 'react';
import { createMagneticPicker } from '@maxsnr/magnetic-picker';
import '@maxsnr/magnetic-picker/styles.css';

export function ExerciseList({ exercises, onSelect }) {
  const listRef = useRef(null);

  useEffect(() => {
    const picker = createMagneticPicker(listRef.current, {
      onSelect: (value) => onSelect(value),
    });
    return () => picker.destroy();
  }, [onSelect]);

  return (
    <ul ref={listRef}>
      {exercises.map((exercise) => (
        <li key={exercise.id} data-picker-item data-picker-value={exercise.id}>
          <button data-picker-action type="button">
            {exercise.name}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

## Vue

```vue
<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { createMagneticPicker } from '@maxsnr/magnetic-picker';
import '@maxsnr/magnetic-picker/styles.css';

const list = ref(null);
let picker;

onMounted(() => {
  picker = createMagneticPicker(list.value, {
    onSelect: (value) => console.log(value),
  });
});
onBeforeUnmount(() => picker?.destroy());
</script>

<template>
  <ul ref="list">
    <li
      v-for="exercise in exercises"
      :key="exercise.id"
      data-picker-item
      :data-picker-value="exercise.id"
    >
      <button data-picker-action type="button">{{ exercise.name }}</button>
    </li>
  </ul>
</template>
```

Other frameworks use the same lifecycle contract: initialize after semantic markup is mounted, retain the returned instance, and call `destroy()` before unmounting or replacing the list. `onCancel` receives no arguments. Advanced options include `disabled`, `cancel`, `cancelLabel`, `holdMs`, and `detentDistance`; selector and class overrides are available when integrating with an existing design system.
