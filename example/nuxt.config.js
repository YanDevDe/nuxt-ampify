
module.exports = {
  head: {
    title: process.env.npm_package_name || '',
    htmlAttrs: {
      lang: 'en',
      'xml:lang': 'en'
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: process.env.npm_package_description || '' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
    ]
  },
  loading: { color: '#fff' },
  buildModules: [
    'nuxt-purgecss'
  ],
  purgeCSS: {
    enabled: true
  },
  modules: [
    // Doc: https://buefy.github.io/#/documentation
    'nuxt-buefy',
    { handler: require('../') }
  ],
  build: {
    extractCSS: true
  },
  SEOify: {

  }
}
