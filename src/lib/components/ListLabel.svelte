<script lang="ts">
  // A small label that names the group of rows below it. It is never tappable, unlike a row.
  let { text, id }: { text: string; id?: string } = $props();
</script>

<li class="list-label" data-picker-skip>
  <h2 {id}>{text}</h2>
</li>
