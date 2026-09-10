# Magnetic Picker

Dependency-free browser ES module that adds long-press, detent-style selection to a vertically scrolling list.

```js
import { createMagneticPicker } from '@maxsnr/magnetic-picker';
import '@maxsnr/magnetic-picker/styles.css';

const picker = createMagneticPicker(document.querySelector('.list'), {
  rowSelector: ':scope > li:not([hidden])',
  onSelect: (action, row) => action.click(),
});

// Remove listeners and generated controls when the list is unmounted.
picker.destroy();
```

The picker uses native Pointer Events, keyboard Escape handling, scrolling, and vibration when supported. The host owns navigation, markup, and visual styling through the option callbacks and class names.
