import { ipcMain } from 'electron'
import { configuration } from './app/configuration'
import { getGameData } from './app/main'
import { askForFolder } from './app/configuration'
import { setLocation } from './app/locations'
import { addEvolution, removeEvolution, modEvolution } from './app/species/evolutions'
import { modTrainerParty } from './app/trainers/edit'
import { TrainerPokemon } from './app/trainers/teams'

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
    ipcMain.on('rem-evolution', (_event, specie: string, evoIndex: number) => {
        removeEvolution(configuration.project_root, specie, evoIndex)
    })
    ipcMain.on('mod-evolution', (_event, specie: string, evoIndex: number, kind: string, reason: string, into: string) => {
        modEvolution(configuration.project_root, specie, evoIndex, kind, reason, into)
    })
    ipcMain.on('mod-trainer', (_event, ptr: string, party: TrainerPokemon[]) => {
        modTrainerParty(configuration.project_root, ptr, party)
    })
}
