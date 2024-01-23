<script setup lang="ts">
import { useData } from 'vitepress'
// https://vitepress.dev/reference/runtime-api#usedata
</script>

<template>
  <div class="wrap">
    <header class="header">
      <div class="header__section header__section--media">
        <a href="/"> 
          <img src="/profile.jpeg" width="100" height="100" alt="Daniel" />
        </a>
      </div>

      <div class="header__section header__section--menu">
        <a class="logo" href="/"> Daniel Kaufmann</a>
        <nav class="menu">
          <a href="/work.html" aria-label="work" class="menu__item">Work</a>
          <a href="/projects.html" aria-label="projects" class="menu__item">Projects</a>
          <a href="/contact.html" aria-label="contact" class="menu__item">Contact</a>
          <a href="/cv.pdf" ria-label="cv" class="menu__item">CV</a>
        </nav>
      </div>
    </header>
    <Content class="page-text" />
  </div>
</template>
