import { ipcMain } from 'electron'
import { gameData, getGameData } from './app/main'
import { askForFolder, configuration } from './app/configuration'
import { setLocation, locationCQ } from './app/locations'
import { replaceEvolution, evoCQ, Evolution } from './app/species/evolutions'
import { modTrainerParty, trainerEditCQ, modTrainer, rmInsane, addInsane, removeTrainer, addTrainer, renameTrainer } from './app/trainers/edit'
import { TrainerPokemon } from './app/trainers/teams'
import { Trainer } from './app/trainers/trainers'
import { modTMHM, TMHMCQ } from './app/species/tmhm_learnsets'
import { EggMoveCQ, replaceEggMoves } from './app/species/egg_moves'
import { LevelUpMove } from './app/species/level_up_learnsets'
import { BSCQ, changeAbis, changeBaseStats, changeTypes } from './app/species/base_stats'
import { DexCQ, changeDesc } from './app/species/pokedex'
import { canRunProto, checkProtoExistence, writeSpecies } from './proto_compiler'
import { getBaseSpecies, getLearnsetMon, getUniversalTutors } from './app/species/species.js'
import { create } from '@bufbuild/protobuf'
import { Species_Learnset, Species_Learnset_LevelUpMoveSchema, Species_LearnsetSchema } from './gen/SpeciesList_pb.js'
import { CallQueue } from './call_queue.js'
import { MoveEnum } from './gen/MoveEnum_pb.js'
import { Type } from './gen/Types_pb.js'

function invertMap<K, V>(map: Map<K, V>): Map<V, K> {
  return new Map([...map.entries()].map(it => [it[1], it[0]]))
}

const SpeciesCQ = new CallQueue("Species")
function markSpeciesDirty() {
  if (!SpeciesCQ.queue.length) {
    SpeciesCQ.feed(() => {
      writeSpecies(configuration.project_root, gameData.speciesList)
    }).poll()
  }
}

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
  ipcMain.on('change-evolution', (_event, specie: string, evos: Evolution[]) => {
    evoCQ.feed(() => {
      replaceEvolution(specie, evos)
    }).poll()
  })
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
  const targetChangeMove = {
    "tutor": (specie: string, moves: string[]) => {
      const speciesEnumMap = invertMap(gameData.speciesEnumMap)
      const moveEnumMap = invertMap(gameData.moveEnumMap)
      const speciesMap = gameData.speciesMap
      const learnsetMon = getLearnsetMon(speciesMap.get(speciesEnumMap.get(specie)!!)!!, speciesMap)
      if (!learnsetMon.learnsetOrRef) {
        learnsetMon.learnsetOrRef = { value: create(Species_LearnsetSchema), case: "learnset" }
      }
      const learnset = learnsetMon.learnsetOrRef.value as Species_Learnset
      const universalTutors = getUniversalTutors(learnset.universalTutors, learnsetMon.gender.case === "genderless")
      learnset.tutor = moves.filter(it => !universalTutors.includes(it)).map(it => moveEnumMap.get(it)!!)

      markSpeciesDirty()
    },
  }
  ipcMain.on('change-moves', (_event, target: string, specie: string, moves: string[]) => {
    const targetCall = targetChangeMove[target]
    if (targetCall) targetCall(specie, moves)
  })
  ipcMain.on('change-learnset', (_event, specie: string, moves: LevelUpMove[]) => {
    const speciesEnumMap = invertMap(gameData.speciesEnumMap)
    const moveEnumMap = invertMap(gameData.moveEnumMap)
    const speciesMap = gameData.speciesMap
    const learnsetMon = getLearnsetMon(speciesMap.get(speciesEnumMap.get(specie)!!)!!, speciesMap)
    if (!learnsetMon.learnsetOrRef) {
      learnsetMon.learnsetOrRef = { value: create(Species_LearnsetSchema), case: "learnset" }
    }
    const learnset = learnsetMon.learnsetOrRef.value as Species_Learnset
    const moveGrouping: (MoveEnum[] | undefined)[] = []
    for (const move of moves) {
      const grouping = moveGrouping[move.level] || (moveGrouping[move.level] = [])
      grouping.push(moveEnumMap.get(move.move)!!)
    }

    learnset.level = []
    for (let i = 0; i < moveGrouping.length; i++) {
      if (!moveGrouping[i]) continue
      learnset.level.push(create(Species_Learnset_LevelUpMoveSchema, {
        level: i,
        move: moveGrouping[i]
      }))
    }

    markSpeciesDirty()
  })
  ipcMain.on('change-abis', (_event, specie: string, field: string, abis: string[]) => {
    const abilityMap = invertMap(gameData.abilityEnumMap)
    const speciesMap = invertMap(gameData.speciesEnumMap)

    const species = gameData.speciesMap.get(speciesMap.get(specie)!!)!!
    const abilities = abis.map(it => abilityMap.get(it)!!)
    if (field === "abis") {
      species.ability = abilities
    } else {
      species.innate = abilities
    }

    markSpeciesDirty()
  })
  ipcMain.on('change-bs', (_event, specie: string, values: number[]) => {
    const speciesMap = invertMap(gameData.speciesEnumMap)
    const species = gameData.speciesMap.get(speciesMap.get(specie)!!)!!
    species.hp = values[0]
    species.atk = values[1]
    species.def = values[2]
    species.spatk = values[3]
    species.spdef = values[4]
    species.spe = values[5]

    markSpeciesDirty()
  })
  ipcMain.on('change-spc-type', (_event, specie: string, types: [string, string]) => {
    const speciesMap = invertMap(gameData.speciesEnumMap)
    const species = gameData.speciesMap.get(speciesMap.get(specie)!!)!!
    species.type = Type[types[0].slice("TYPE_".length)]
    if (types[0] !== types[1]) {
      species.type2 = Type[types[1].slice("TYPE_".length)]
    } else {
      species.type2 = Type.NONE
    }

    markSpeciesDirty()
  })
  ipcMain.on('change-spc-desc', (_event, specie: string, desc: string) => {
    const speciesMap = invertMap(gameData.speciesEnumMap)
    const species = getBaseSpecies(gameData.speciesMap.get(speciesMap.get(specie)!!)!!, gameData.speciesMap)
    species.description = desc

    markSpeciesDirty()
  })
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
