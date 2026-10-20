<script lang="ts">
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import ListRow from '../components/ListRow.svelte';

  // The destructive row at the top of a History detail: one tap opens a confirmation whose safe
  // choice is focused, and only the destructive choice calls `ondelete`.
  let {
    label,
    title,
    body,
    keepLabel,
    ondelete,
  }: {
    label: string;
    title: string;
    body: string;
    keepLabel: string;
    ondelete: () => void | Promise<unknown>;
  } = $props();
  let open = $state(false);
</script>

<ListRow {label} icon="trash" iconLabel={label} linkClass="is-danger" onclick={() => (open = true)}>
  {#snippet after()}
    <ConfirmDialog
      bind:open
      {title}
      {body}
      actions={[
        { value: 'cancel', label: keepLabel, primary: true },
        { value: 'delete', label: label, destructive: true },
      ]}
      onclose={(value) => value === 'delete' && ondelete()}
    />
  {/snippet}
</ListRow>
