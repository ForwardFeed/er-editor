import { ipcMain } from 'electron'
import { getGameData } from './app/main'
import { askForFolder } from './app/configuration'
import { setLocation } from './app/locations'


export function setupApi(window: Electron.BrowserWindow){
    ipcMain.on('get-game-data', () => {
        getGameData(window)
    })
    ipcMain.on('ask-for-folder', () => {
        askForFolder(window)
    })
    ipcMain.on('set-location', (_event, mapName: string, field: string, monID: number, key: string, value: string | number) => {
        setLocation(mapName, field, monID, key, value)
    })
}
