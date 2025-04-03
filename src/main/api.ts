import { ipcMain } from 'electron'
import { getGameData } from './app/main'
import { askForFolder } from './app/configuration'
import { setLocation, locationCQ } from './app/locations'
import { Evolution } from './app/species/evolutions'
import { modTrainerParty, trainerEditCQ, modTrainer, rmInsane, addInsane, removeTrainer, addTrainer, renameTrainer } from './app/trainers/edit'
import { TrainerPokemon } from './app/trainers/teams'
import { Trainer } from './app/trainers/trainers'
import { LevelUpMove } from './app/species/level_up_learnsets'
import { canRunProto, checkProtoExistence } from './proto_compiler'
import { udpateSpeciesType, updateAbilities, updateBaseStats, updateEvos, updateLearnset, updateSpeciesDescription, updateTutors } from './app/species/species_writer.js'

export function setupApi(window: Electron.BrowserWindow) {
  ipcMain.on('get-game-data', () => {
    getGameData(window)
  })
  ipcMain.on('ask-for-folder', () => {
    askForFolder(window)
  })
  ipcMain.on('set-location', (_event, mapName: string, field: string, monID: number, key: string, value: string | number) => {
    locationCQ.feed(() => {
      setLocation(mapName, field, monID, key, value)
    }).poll()
  })
  ipcMain.on('change-evolution', (_event, specie: string, evos: Evolution[]) => { updateEvos(specie, evos) })
  ipcMain.on('mod-trainer-party', (_event, ptr: string, party: TrainerPokemon[]) => {
    trainerEditCQ.feed(() => {
      modTrainerParty(ptr, party)
    }).poll()
  })

  ipcMain.on('mod-trainer', (_event, trainer: Trainer) => {
    trainerEditCQ.feed(() => {
      modTrainer(trainer)
    }).poll()
  })
  ipcMain.on('rm-insane', (_event, tNAME: string, ptrInsane: string) => {
    trainerEditCQ.feed(() => {
      rmInsane(tNAME, ptrInsane)
    }).poll()
  })
  ipcMain.on('add-insane', (_event, tNAME: string, ptrInsane: string, insaneParty: TrainerPokemon[]) => {
    trainerEditCQ.feed(() => {
      addInsane(tNAME, ptrInsane, insaneParty)
    }).poll()
  })
  ipcMain.on('remove-trainer', (_event, tNAME: string, ptrs: string[], tRematch: string) => {
    trainerEditCQ.feed(() => {
      removeTrainer(tNAME, ptrs, tRematch)
    }).poll()
  })
  ipcMain.on('add-trainer', (_event, trainer: Trainer, tRematch: string, tMap: string, tBase: string) => {
    trainerEditCQ.feed(() => {
      addTrainer(trainer, tRematch, tMap, tBase)
    }).poll()
  })
  ipcMain.on('rename-trainer', (_event, previous: string, next: string) => {
    trainerEditCQ.feed(() => {
      renameTrainer(previous, next)
    }).poll()
  })
  const targetChangeMove = { "tutor": updateTutors, }
  ipcMain.on('change-moves', (_event, target: string, specie: string, moves: string[]) => {
    const targetCall = targetChangeMove[target]
    if (targetCall) targetCall(specie, moves)
  })
  ipcMain.on('change-learnset', (_event, specie: string, moves: LevelUpMove[]) => { updateLearnset(specie, moves) })
  ipcMain.on('change-abis', (_event, specie: string, field: "abis" | "inns", abis: string[]) => { updateAbilities(specie, field, abis) })
  ipcMain.on('change-bs', (_event, specie: string, values: number[]) => { updateBaseStats(specie, values) })
  ipcMain.on('change-spc-type', (_event, specie: string, types: [string, string]) => { udpateSpeciesType(specie, types) })
  ipcMain.on('change-spc-desc', (_event, specie: string, desc: string) => { updateSpeciesDescription(specie, desc) })
  ipcMain.on('check-protoc', (_event) => {
    try {
      checkProtoExistence()
      const version = canRunProto()
      window.webContents.send('protoc-ok', version)
    } catch (e) {
      window.webContents.send('protoc-err', e)
    }
  })
}
