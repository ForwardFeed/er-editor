import { ipcMain } from 'electron'
import { configuration } from './app/configuration'
import { getGameData } from './app/main'
import { askForFolder } from './app/configuration'
import { setLocation } from './app/locations'
import { addEvolution } from './app/species/evolutions'


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
    ipcMain.on('add-evolution', (_event, specie: string, kind: string, reason: string, into: string) => {
        addEvolution(configuration.project_root, specie, kind, reason, into)
    })
}
