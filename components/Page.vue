<template>
  <div>
    <h1 class="my-5">{{ page.title }}</h1>
    <!-- eslint-disable vue/no-v-html -->
    <div id="page" class="page-text" v-html="content"></div>
  </div>
</template>
<script>
import pagesQuery from '~/apollo/queries/page/page'

export default {
  async asyncData({ app, route, redirect }) {
    const pathSplit = route.path.split('/')
    const path = pathSplit.length > 1 ? pathSplit[1] : null
    const result = await app.apolloProvider.defaultClient.query({
      prefetch: false,
      query: pagesQuery,
      variables: {
        slug: path,
      },
    })
    if (result.data.pages.length === 0) {
      redirect('/404')
    }
    // get default renderer
    const defaultRender =
      app.$md.renderer.rules.link_open ||
      function (tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options)
      }
    // override image rule to prepend api base-url
    app.$md.renderer.rules.image = (tokens, idx, options, env, self) => {
      const index = tokens[idx].attrIndex('src')
      tokens[idx].attrs[index][1] =
        process.env.strapiBaseUri + tokens[idx].attrs[index][1]
      return defaultRender(tokens, idx, options, env, self)
    }
    return {
      page: result.data.pages[0],
      content: result.data.pages[0]
        ? app.$md.render(result.data.pages[0].content)
        : '',
    }
  },
}
</script>
