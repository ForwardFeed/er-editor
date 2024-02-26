import { defineConfig, externalizeDepsPlugin} from 'electron-vite'
import inject from '@rollup/plugin-inject';
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [
      inject({
        jQuery: "jquery",
        "window.jQuery": "jquery",
        $: "jquery"
      }),
      viteStaticCopy({
        targets: [
          {
            src: path.resolve(__dirname, './src/renderer/icons') + '/[!.]*', // 1️⃣
            dest: './icons/', // 2️⃣
          }
        ]
      })
    ]
  },
})
