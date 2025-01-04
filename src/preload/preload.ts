import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export interface CustomAPI{
  send: (channel: string, ...args: any[]) => void
  receive: (channel: string, ...args: any[]) => void
}

// Custom APIs for renderer
const api: CustomAPI = {
    send: (channel, ...args) => {
      // whitelist channels
      let validChannels = ["get-game-data", "ask-for-folder", "set-location", "change-evolution",
    "mod-trainer-party", 'remove-trainer', 'add-trainer', "mod-trainer", 'rm-insane', 'add-insane', 'rm-rem', 'add-rem',
    "rename-trainer", "change-moves", "change-learnset", "change-eggmoves", "change-abis", "change-bs", 'change-spc-type',
    'change-spc-desc', 'check-protoc'];
      if (validChannels.includes(channel)) {
        console.log(channel, ...args)
          ipcRenderer.send(channel, ...args);
      } else  {
        console.warn('invalid send call:' + channel)
      }
    },
    receive: (channel, func) => {
        let validChannels = ["game-data", "no-game-data", "ok-folder", "protoc-ok", "protoc-err"];
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`
            try{
              console.log(channel)
              ipcRenderer.on(channel, (_event, ...args) => {
                try{
                  func(...args)
                }catch(e){
                  console.log('fuck in: ' + channel, ' with args: ' + args, 'reason:', e)
                }
              });
            } catch(e){
              console.error('Error receiving : ' + channel, e)
            }
            
        } else {
          console.warn('invalid receive call:' + channel)
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
