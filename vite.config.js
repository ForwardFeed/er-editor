import inject from '@rollup/plugin-inject';
/** @type {import('vite').UserConfig} */
export default defineConfig({
    assetsInclude: ['**/*.ttf'],
    plugins: [
        inject({
          jQuery: "jquery",
          "window.jQuery": "jquery",
          $: "jquery"
        })
      ]
})