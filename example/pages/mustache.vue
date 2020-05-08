<template>
  <amp-list
    id="time"
    layout="fixed-height"
    height="60"
    src="https://playground.amp.dev/documentation/examples/api/time"
    binding="refresh"
    single-item
    items="."
  >
    <amp-mustache>
      <template v-pre>
        The time is: {{time}} <br>
        <button class="button" on="tap:time.refresh">
          Refresh
        </button>
      </template>
    </amp-mustache>
  </amp-list>
</template>

<script>

export default {
  name: 'Mustache',

  components: {
  }
}
</script>
