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
import { ArgumentSchema, Crit, HitsAir, MoveEffectArgumentSchema, MoveListSchema, MoveSchema, MoveSplit, MoveTarget, SplitFlag, Status } from '../gen/MoveList_pb.js';
import { MoveEnum } from '../gen/MoveEnum_pb.js';
import { MoveEffect } from '../gen/MoveEffect_pb.js';
import { Type } from '../gen/Types_pb.js';
import { writeMoves } from '../proto_compiler.js';
import { Xtox } from './parse_utils.js';
import { BattleMoveEffect } from '../gen/BattleMoveEffect_pb.js';
//import { comparify } from './comparify';

export interface GameData {
  species: Species.Specie[]
  abilities: Map<string, Abilities.Ability>
  moves: Map<string, Moves.Move>,
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
  moves: new Map(),
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
          const moves = [...gameData.moves.values()].map(it => {
            function hasFlag(flag) {
              if (flag.includes("_")) flag = Xtox("FLAG_", flag)
              return it.flags.includes(flag)
            }
            console.log("EFFECT_" + it.effect.replace(" ", "_").toUpperCase())
            const move = create(MoveSchema, {
              id: MoveEnum[it.NAME],
              name: it.name,
              shortName: it.shortName,
              description: it.desc,
              shortDescription: it.desc,
              effect: MoveEffect["EFFECT_" + it.effect.replace(" ", "_").toUpperCase()],
              split: MoveSplit[it.split],
              type: Type[it.types[0].toUpperCase()],
              type2: (it.types.length > 1) ? Type[it.types[1].toUpperCase()] : Type.NONE,
              target: MoveTarget[it.target],
              power: it.power,
              accuracy: it.acc,
              pp: it.pp,
              effectChance: it.chance,
              priority: it.priority,
              contact: hasFlag("FLAG_MAKES_CONTACT"),
              ignoresStatStages: hasFlag("FLAG_STAT_STAGES_IGNORED"),
              doubleDamageVsMega: hasFlag("doubleDamageVsMega"),
              everyOtherTurn: hasFlag("everyOtherTurn"),
              isProtection: hasFlag("FLAG_PROTECTION_MOVE"),
              ignoresAbility: hasFlag("FLAG_TARGET_ABILITY_IGNORED"),
              twoTurn: hasFlag("twoTurnMove"),
              snatchAffected: hasFlag("FLAG_SNATCH_AFFECTED"),
              magicCoatAffected: hasFlag("FLAG_MAGIC_COAT_AFFECTED"),
              mirrorMoveAffected: hasFlag("FLAG_MIRROR_MOVE_AFFECTED"),
              noKingsRock: !hasFlag("FLAG_KINGS_ROCK_AFFECTED") && it.split !== "STATUS",
              reckless: hasFlag("FLAG_RECKLESS_BOOST"),
              ironFist: hasFlag("FLAG_IRON_FIST_BOOST"),
              noSheerForce: !hasFlag("FLAG_SHEER_FORCE_BOOST") && it.split !== "STATUS" && it.chance > 0,
              strongJaw: hasFlag("FLAG_STRONG_JAW_BOOST"),
              megaLauncher: hasFlag("FLAG_MEGA_LAUNCHER_BOOST"),
              striker: hasFlag("FLAG_STRIKER_BOOST"),
              hitsUnderground: hasFlag("FLAG_DMG_UNDERGROUND"),
              hitsUnderwater: hasFlag("FLAG_DMG_UNDERWATER"),
              sound: hasFlag("FLAG_SOUND"),
              ballistic: hasFlag("FLAG_BALLISTIC"),
              powderAffected: hasFlag("FLAG_POWDER"),
              dance: hasFlag("FLAG_DANCE"),
              ignoresLevitation: hasFlag("FLAG_DMG_UNGROUNDED_IGNORE_TYPE_IF_FLYING"),
              thawUser: hasFlag("FLAG_THAW_USER"),
              ignoresSubstitute: hasFlag("FLAG_HIT_IN_SUBSTITUTE"),
              keenEdge: hasFlag("FLAG_KEEN_EDGE_BOOST"),
              bone: hasFlag("FLAG_BONE_BASED"),
              weather: hasFlag("FLAG_WEATHER_BASED"),
              field: hasFlag("FLAG_FIELD_BASED"),
              noParentalBond: hasFlag("parentalBondBanned"),
              arrow: hasFlag("arrowBased"),
              horn: hasFlag("hornBased"),
              air: hasFlag("airBased"),
              hammer: hasFlag("hammerBased"),
              throwing: hasFlag("throwingBased"),
              lunar: hasFlag("lunar"),
              metronomeBanned: hasFlag("metronomeBanned"),
              copycatBanned: hasFlag("copycatBanned"),
              sleepTalkBanned: hasFlag("sleepTalkBanned"),
              mimicBanned: hasFlag("mimicBanned"),
              splitModifier: it.splitModifier,
            })

            switch (move.id) {
              case MoveEnum.MOVE_DOUBLE_IRON_BASH:
              case MoveEnum.MOVE_TWINEEDLE:
              case MoveEnum.MOVE_CROSS_POISON:
              case MoveEnum.MOVE_DOUBLE_SHOCK:
                move.hitCount = 2
                break
            }

            if (hasFlag("FLAG_DMG_2X_IN_AIR")) {
              move.hitsAir = HitsAir.DOUBLE_DAMAGE
            } else if (hasFlag("FLAG_DMG_IN_AIR")) {
              move.hitsAir = HitsAir.HITS
            }

            if (hasFlag("alwaysCrit")) {
              move.crit = Crit.ALWAYS
            } else if (hasFlag("FLAG_HIGH_CRIT")) {
              move.crit = Crit.HIGH
            }

            switch (move.target) {
              case MoveTarget.ALLY:
              case MoveTarget.BOTH:
              case MoveTarget.DEPENDS:
              case MoveTarget.FOES_AND_ALLY:
              case MoveTarget.RANDOM:
              case MoveTarget.SELECTED:
              case MoveTarget.USER_OR_SELECTED:
              case MoveTarget.USER_OR_ALLY:
                if (!hasFlag("FLAG_PROTECT_AFFECTED")) move.ignoresProtect = true
            }

            if (it.argument) {
              const argumentWrapper = create(ArgumentSchema)
              if (it.argument.startsWith("TYPE_")) {
                argumentWrapper.argument = {
                  case: "type",
                  value: Type[it.argument.substring("TYPE_".length)]
                }
              } else if (it.argument.startsWith("STATUS1_")) {
                argumentWrapper.argument = {
                  case: "status",
                  value: Status[it.argument]
                }
              } else if (it.argument.startsWith("MOVE_EFFECT_")) {
                argumentWrapper.argument = {
                  case: "effect",
                  value: create(MoveEffectArgumentSchema, {
                    affectsUser: it.argument.includes("MOVE_EFFECT_AFFECTS_USER"),
                    certain: it.argument.includes("MOVE_EFFECT_CERTAIN"),
                    effect: BattleMoveEffect[it.argument.trimStart().split(" ")[0]]
                  })
                }
              } else if (!isNaN(parseInt(it.argument))) {
                argumentWrapper.argument = {
                  case: "int",
                  value: parseInt(it.argument),
                }
              } else {
                argumentWrapper.argument = {
                  case: "other",
                  value: it.argument
                }
              }
              move.argument = argumentWrapper
            }

            return move
          })
          writeMoves(ROOT_PRJ, create(MoveListSchema, { moves: moves }))
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
