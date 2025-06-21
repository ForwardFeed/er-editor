// electron.vite.config.ts
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import inject from "@rollup/plugin-inject";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "path";
var __electron_vite_injected_dirname = "/mnt/c/Users/adinf/Documents/er-editor";
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
          },
          {
            src: path.resolve(__electron_vite_injected_dirname, "./src/renderer/font") + "/[!.]*",
            //
            dest: "./font/"
          },
          {
            src: path.resolve(__electron_vite_injected_dirname, "./src/renderer/css/") + "/[!.]*",
            //
            dest: "./css/"
          }
        ]
      })
    ]
  }
});
export {
  electron_vite_config_default as default
};
