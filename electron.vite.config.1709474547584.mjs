// electron.vite.config.ts
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import inject from "@rollup/plugin-inject";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "path";
var __electron_vite_injected_dirname = "/media/notalinux/sdb3/Programation/TypeScript/ERlectronEditor/er-voltage-editor";
var electron_vite_config_default = defineConfig({
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
            src: path.resolve(__electron_vite_injected_dirname, "./src/renderer/icons") + "/[!.]*",
            //
            dest: "./icons/"
            //
          }
        ]
      })
    ]
  }
});
export {
  electron_vite_config_default as default
};
