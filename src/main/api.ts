import { ipcMain } from 'electron'
import { configuration } from './app/configuration'
import { getGameData } from './app/main'
import { askForFolder } from './app/configuration'
import { setLocation, locationCQ } from './app/locations'
import { addEvolution, removeEvolution, modEvolution, evoCQ } from './app/species/evolutions'
import { modTrainerParty , trainerEditCQ, modTrainer, rmInsane, addInsane, rmRem, addRem, removeTrainer, addTrainer} from './app/trainers/edit'
import { TrainerPokemon } from './app/trainers/teams'
import { Trainer } from './app/trainers/trainers'


export function setupApi(window: Electron.BrowserWindow){
    ipcMain.on('get-game-data', () => {
        getGameData(window)
    })
    ipcMain.on('ask-for-folder', () => {
        askForFolder(window)
    })
    ipcMain.on('set-location', (_event, mapName: string, field: string, monID: number, key: string, value: string | number) => {
        locationCQ.feed(()=>{
            setLocation(mapName, field, monID, key, value)
        }).poll()
    })
    ipcMain.on('add-evolution', (_event, specie: string, kind: string, reason: string, into: string) => {
        evoCQ.feed(()=>{
            addEvolution(configuration.project_root, specie, kind, reason, into)
        }).poll()
    })
    ipcMain.on('rem-evolution', (_event, specie: string, evoIndex: number) => {
        evoCQ.feed(()=>{
            removeEvolution(configuration.project_root, specie, evoIndex)
        }).poll()
    })
    ipcMain.on('mod-evolution', (_event, specie: string, evoIndex: number, kind: string, reason: string, into: string) => {
        evoCQ.feed(()=>{
            modEvolution(configuration.project_root, specie, evoIndex, kind, reason, into)
        }).poll()
    })
    ipcMain.on('mod-trainer-party', (_event, ptr: string, party: TrainerPokemon[]) => {
        trainerEditCQ.feed(()=>{
            modTrainerParty(ptr, party)
        }).poll()
    })

    ipcMain.on('mod-trainer', (_event, trainer: Trainer) => {
        trainerEditCQ.feed(()=>{
            modTrainer(trainer)
        }).poll()
    })
    ipcMain.on('rm-insane', (_event, ptrInsane: string) => {
        trainerEditCQ.feed(()=>{
            rmInsane(ptrInsane)
        }).poll()
    })
    ipcMain.on('add-insane', (_event, tNAME: string, ptrInsane: string, insaneParty: TrainerPokemon[]) => {
        trainerEditCQ.feed(()=>{
            addInsane(tNAME, ptrInsane, insaneParty)
        }).poll()
    })
    ipcMain.on('rm-rem', (_event, tNAME: string) => {
        trainerEditCQ.feed(()=>{
            rmRem(tNAME)
        }).poll()
    })
    ipcMain.on('add-rem', (_event, tNAME: string, tName: string, ptr: string, party: TrainerPokemon[])  => {
        trainerEditCQ.feed(()=>{
            addRem(tNAME, tName, ptr, party)
        }).poll()
    })
    ipcMain.on('remove-trainer', (_event, tNAME: string)  => {
        trainerEditCQ.feed(()=>{
            removeTrainer(tNAME)
        }).poll()
    })
    ipcMain.on('add-trainer', (_event, trainer: Trainer)  => {
        trainerEditCQ.feed(()=>{
            addTrainer(trainer)
        }).poll()
    })
}
