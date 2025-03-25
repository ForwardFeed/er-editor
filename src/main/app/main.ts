import * as FS from 'fs'
import * as Path from 'path'

import { getFileData } from './utils';
import * as Moves from './moves/moves'
import * as Species from './species/species'
import * as Abilities from './abilities'
import * as Sprites from './sprites'
import * as Locations from './locations'
import * as Trainers from './trainers/trainers'
import * as ScriptedData from './scripted_data'
import * as BattleItems from './battle_items/battle_items'
//import * as Additionnal from './additional_data/additional'
import * as InternalID from './internal_id'
import { compactify } from './compactify';
import * as Configuration from './configuration';
import { getTutorTMHMList } from './moves/list_tutor_tmhm';
import { getTrainerOrder } from './trainers/trainer_ordering';
import { create } from '@bufbuild/protobuf';
import { MoveList, MoveListSchema } from '../gen/MoveList_pb.js';
import { getUpdatedMoveMapping, readMoves, writeAbilities, writeMoves } from '../proto_compiler.js';
import { AbilityList, AbilityListSchema, AbilitySchema } from '../gen/AbilityList_pb.js';
import { AbilityEnum } from '../gen/AbilityEnum_pb.js';
//import { comparify } from './comparify';

export interface GameData {
  species: Species.Specie[],
  abilities: Map<string, Abilities.Ability>,
  abilityList: AbilityList,
  moves: Map<string, Moves.Move>,
  moveList: MoveList,
  locations: Locations.Locations
  trainers: Map<string, Trainers.Trainer>
  dataScripted: ScriptedData.Result[]
  mapTable: string[],
  battleItems: Map<string, BattleItems.BattleItem>
  speciesInternalID: Map<string, number>,
  movesInternalID: Map<string, number>,
  trainerInternalID: Map<string, number>,
  tutors: string[],
  tmhm: string[],
  trainerOrder: string[]
}

const gameData: GameData = {
  species: [] as Species.Specie[],
  abilities: new Map(),
  abilityList: create(AbilityListSchema),
  moves: new Map(),
  moveList: create(MoveListSchema),
  locations: {} as Locations.Locations,
  trainers: new Map(),
  dataScripted: [],
  mapTable: [],
  battleItems: new Map(),
  speciesInternalID: new Map(),
  movesInternalID: new Map(),
  trainerInternalID: new Map(),
  tutors: [],
  tmhm: [],
  trainerOrder: [],
}

export function getGameData(window: Electron.BrowserWindow) {
  Configuration.verifyConfiguration()
    .then(() => {
      getGameDataData(window.webContents)
    })
    .catch((err) => {
      //
      console.error("error while verifying the data", err)
      window.webContents.send('no-game-data')
    })
}

function getGlobalH(ROOT_PRJ: string) {
  return getFileData(Path.join(ROOT_PRJ, 'include/global.h'), { filterComments: true, filterMacros: true, macros: new Map() })

}

function getGameDataData(webContents: Electron.WebContents) {
  const ROOT_PRJ = Configuration.configuration.project_root
  getGlobalH(ROOT_PRJ)
    .then((global_h) => {
      const optionsGlobal_h = {
        filterComments: true,
        filterMacros: true,
        macros: global_h.macros
      }
      const promiseArray: Array<Promise<unknown>> = []
      promiseArray.push(Species.getSpecies(ROOT_PRJ, optionsGlobal_h, gameData))
      promiseArray.push(Moves.getMoves(ROOT_PRJ, optionsGlobal_h, gameData))
      promiseArray.push(Abilities.getAbilities(ROOT_PRJ, optionsGlobal_h, gameData))
      promiseArray.push(Locations.getLocations(ROOT_PRJ, gameData))
      promiseArray.push(Trainers.getTrainers(ROOT_PRJ, gameData))
      promiseArray.push(ScriptedData.parse(ROOT_PRJ, gameData))
      promiseArray.push(BattleItems.getItems(ROOT_PRJ, gameData))
      promiseArray.push(InternalID.getSpeciesInternalID(ROOT_PRJ, gameData))
      promiseArray.push(InternalID.getMovesInternalID(ROOT_PRJ, gameData))
      promiseArray.push(InternalID.getTrainersInternalID(ROOT_PRJ, gameData))
      promiseArray.push(getTutorTMHMList(ROOT_PRJ, gameData))
      promiseArray.push(getTrainerOrder(gameData))
      //promiseArray.push()
      Promise.allSettled(promiseArray)
        .then((values) => {
          readMoves(ROOT_PRJ)
          console.log(getUpdatedMoveMapping(ROOT_PRJ))
          const moves = [...gameData.moves.values()].map(it => Moves.convertLegacyMove(it))
          gameData.moveList.moves.push(...moves)
          writeMoves(ROOT_PRJ, gameData.moveList)

          const abilities = [...gameData.abilities.values()].map(it => create(AbilitySchema, {
            id: AbilityEnum[it.NAME],
            name: it.name,
            description: it.desc,
          }))
          gameData.abilityList.ability.push(...abilities)
          writeAbilities(ROOT_PRJ, gameData.abilityList)

          values.map((x) => {
            if (x.status !== "fulfilled") {
              console.error(`Something went wrong parsing the data: ${x.reason}`)
              return
            }
            const result = x.value
            if (typeof result !== "object") return

          })
          //Additionnal.getAdditionnalData(ROOT_PRJ, OUTPUT_ADDITIONNAL, gameData)
          const compactGameData = compactify(gameData)
          compactGameData.projet_root = ROOT_PRJ
          webContents.send('game-data', compactGameData)
        })
        .catch((err) => {
          console.error(`Something went wrong parsing the data: ${err}`)
        })

    })
    .catch((reason) => {
      const err = 'Failed at getting global.h reason: ' + reason
      console.error(err)
    })
}

export function getSprites(window: Electron.BrowserWindow) {
  Configuration.verifyConfiguration()
    .then(() => {
      getGetSprites(window.webContents)
    })
    .catch(() => {
      console.error("error while verifying the data")
    })
}

function getGetSprites(_webContents: Electron.WebContents) {
  const ROOT_PRJ = Configuration.configuration.project_root
  getGlobalH(ROOT_PRJ)
    .then((global_h) => {
      const optionsGlobal_h = {
        filterComments: true,
        filterMacros: true,
        macros: global_h.macros
      }
      const OUTPUT_SPRITES = Path.join("./out", "sprites/")
      const OUTPUT_PALETTES = "./out/palettes/"
      if (!FS.existsSync(OUTPUT_SPRITES)) FS.mkdirSync(OUTPUT_SPRITES)
      if (!FS.existsSync(OUTPUT_PALETTES)) FS.mkdirSync(OUTPUT_PALETTES)

      Sprites.getSprites(
        Configuration.configuration.project_root, optionsGlobal_h, OUTPUT_SPRITES, OUTPUT_PALETTES)
        .then(() => {
          console.log('Successfully copied the sprites')
        })
        .catch((err) => {
          console.error('error while trying to catch sprites ' + err)
        })
    })

}
