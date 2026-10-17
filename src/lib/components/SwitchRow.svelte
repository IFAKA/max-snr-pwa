<script lang="ts">
  import { Switch } from 'bits-ui';

  // A list row that turns a setting on or off, on Bits UI's Switch. The whole row is the switch,
  // so the target is the full row height; the track and thumb only show its state.
  let {
    label,
    id,
    checked,
    onchange,
  }: { label: string; id: string; checked: boolean; onchange: (checked: boolean) => void } =
    $props();
</script>

<li>
  <Switch.Root class="list-link switch-row" {id} {checked} onCheckedChange={onchange}>
    <span>{label}</span><span class="switch" aria-hidden="true"><span></span></span>
  </Switch.Root>
</li>
