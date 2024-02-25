import { defineConfig} from 'electron-vite'
import inject from '@rollup/plugin-inject';
import { viteStaticCopy } from 'vite-plugin-static-copy'
/** @type {import('vite').UserConfig} */
export default defineConfig({
    assetsInclude: ['**/renderer/icons/*'],
    plugins: [
        inject({
          jQuery: "jquery",
          "window.jQuery": "jquery",
          $: "jquery"
        }),
        viteStaticCopy({
          targets: [
            {
              src: 'src/renderer/icons',
              dest: 'renderer/icons'
            }
          ]
        })
      ]
})