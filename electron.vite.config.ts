import { defineConfig, externalizeDepsPlugin} from 'electron-vite'
import inject from '@rollup/plugin-inject';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    assetsInclude: ['*/**/*.ttf', 'vendor/*'],
    plugins: [
      inject({
        jQuery: "jquery",
        "window.jQuery": "jquery",
        $: "jquery"
      })
    ]
  },
})
