<template>
  <div>
    <section class="section">
      <div class="columns is-mobile">
        <card
          title="Free"
          icon="github-circle"
        >
          Open source on <a href="https://github.com/buefy/buefy">
            GitHub
          </a>
        </card>

        <card
          title="Responsive"
          icon="cellphone-link"
        >
          <b class="has-text-grey">
            Every
          </b> component is responsive
        </card>

        <card
          title="Modern"
          icon="alert-decagram"
        >
          Built with <a href="https://vuejs.org/">
            Vue.js
          </a> and <a href="http://bulma.io/">
            Bulma
          </a>
        </card>

        <card
          title="Lightweight"
          icon="arrange-bring-to-front"
        >
          No other internal dependency
        </card>
      </div>
    </section>
    <section class="section">
      <img src="/images/car.jpg">
      <img src="https://images.unsplash.com/photo-1553284965-5dd8352ff1bd?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1350&q=80">
    </section>
  </div>
</template>

<script>
import Card from '~/components/Card'

export default {
  name: 'HomePage',

  components: {
    Card
  }
}
</script>
