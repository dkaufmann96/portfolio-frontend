export default {
  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    titleTemplate: '%s - ' + process.env.DEFAULT_TITLE,
    title: process.env.DEFAULT_TITLE || '',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: process.env.npm_package_description || '', },
      { name: 'format-detection', content: 'telephone=no' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
    ]
  },

  target: 'static',

  env: {
    strapiBaseUri: process.env.API_URL || 'http://localhost:1337',
  },

  // Load fonts
  webfontloader: {
    google: {
      families: ['Rubik:300,400,500&display=swap'],
    },
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: ['~/assets/styles.scss'],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [],

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
    // https://go.nuxtjs.dev/eslint
    '@nuxtjs/eslint-module',
    // https://github.com/nuxt-community/dotenv-module
    '@nuxtjs/dotenv',
    // https://github.com/robcresswell/nuxt-compress
    'nuxt-compress',
    '@/modules/sitemapRouteGenerator'
  ],

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
    // https://go.nuxtjs.dev/pwa
    '@nuxtjs/pwa',
    '@dkaufmann96/nuxtjs-google-gtag',
    '@nuxtjs/component-cache',
    'nuxt-webfontloader',
    '@nuxtjs/sitemap',
    '@nuxtjs/apollo',
    '@nuxtjs/markdownit',
    'nuxt-responsive-loader',
  ],

  render: {
    static: {
      maxAge: 31536000, // 1 year
    },
  },

  sitemap: {
    hostname: 'https://danielkaufmann.at',
    gzip: true,
  },

  // PWA module configuration: https://go.nuxtjs.dev/pwa
  pwa: {
    manifest: {
      lang: 'en'
    },
    meta: {
      name: process.env.DEFAULT_TITLE,
    },
  },

  'google-gtag': {
    id: 'UA-148069913-1',
    config: {
      anonymize_ip: true, // anonymize IP
      send_page_view: false, // might be necessary to avoid duplicated page track on page reload
    },
    debug: false, // enable to track in dev mode
    disableAutoPageTrack: false, // disable if you don't want to track each page route with router.afterEach(...).
  },

  apollo: {
    clientConfigs: {
      default: {
        httpEndpoint:
          process.env.BACKEND_URL || 'http://localhost:1337/graphql',
      },
    },
  },

  markdownit: {
    preset: 'default',
    linkify: true,
    breaks: true,
    injected: true,
  },

  responsiveLoader: {
    name: 'images/[name]-[width].[ext]',
    sizes: [80, 100, 240, 320, 460, 640, 768, 960, 1024, 1280, 1600, 1920],
    placeholder: true,
  },

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {
    analyze: false,
    extractCSS: true,
  },

  router: {
    extendRoutes(routes, resolve) {
      routes.push({
        name: 'custom',
        path: '*',
        component: resolve(__dirname, 'components/Page.vue'),
      })
    },
  },
}
