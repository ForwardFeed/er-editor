import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
    send: (channel, ...args) => {
      // whitelist channels
      let validChannels = ["get-game-data", "ask-for-folder", "set-location", "add-evolution", "mod-evolution", "rem-evolution",
    "mod-trainer"];
      if (validChannels.includes(channel)) {
          ipcRenderer.send(channel, ...args);
      }
    },
    receive: (channel, func) => {
        let validChannels = ["game-data", "no-game-data", "ok-folder"];
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`
            try{
              ipcRenderer.on(channel, (_event, ...args) => func(...args));
            } catch(e){
              console.error(e)
            }
            
        }
    }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
