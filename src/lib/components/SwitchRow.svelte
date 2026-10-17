<script lang="ts">
  // A list row that turns a setting on or off. The whole row is the switch, so the target is the
  // full row height; the track and thumb only show its state.
  let {
    label,
    id,
    checked,
    onchange,
  }: { label: string; id: string; checked: boolean; onchange: (checked: boolean) => void } =
    $props();
</script>

<li>
  <button
    class="list-link switch-row"
    {id}
    type="button"
    role="switch"
    aria-checked={checked}
    onclick={() => onchange(!checked)}
    ><span>{label}</span><span class="switch" aria-hidden="true"><span></span></span></button
  >
</li>
