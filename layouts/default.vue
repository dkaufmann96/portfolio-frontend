<template>
  <div class="wrap">
    <header class="header">
      <div class="header__section header__section--media">
        <nuxt-link to="/">
          <img
            src="~/assets/profile.jpeg"
            width="100"
            height="100"
            :srcset="require('~/assets/profile.jpeg').srcSet"
            alt="Daniel"
          />
        </nuxt-link>
      </div>

      <div class="header__section header__section--menu">
        <nuxt-link class="logo" to="/"> Daniel Kaufmann </nuxt-link>
        <nav class="menu">
          <nuxt-link to="/work" aria-label="work" class="menu__item"
            >Work</nuxt-link
          >
          <nuxt-link to="/projects" aria-label="projects" class="menu__item"
            >Projects</nuxt-link
          >
          <nuxt-link to="/contact" aria-label="contact" class="menu__item"
            >Contact</nuxt-link
          >
        </nav>
      </div>
    </header>
    <router-view></router-view>
  </div>
</template>

<script>
export default {
  head() {
    return {
      title: 'Home',
    }
  },
}
</script>
