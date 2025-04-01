import { join } from "path"
import { regexGrabNum, regexGrabStr, Xtox } from "../parse_utils"
import { FileDataOptions, getFileData, getMulFilesData, autojoinFilePath } from "../utils"
import { GameData } from "../main"
import { ArgumentSchema, Crit, enum_name, field_name, HitsAir, is_flag, MiscMoveEffect, MoveEffectArgumentSchema, MoveSchema, MoveSplit, MoveTarget, Move as ProtoMove, SplitFlag, Status } from "../../gen/MoveList_pb.js"
import { MoveEnum } from "../../gen/MoveEnum_pb.js"
import { create, getOption } from "@bufbuild/protobuf"
import { Type } from "../../gen/Types_pb.js"
import { getUpdatedMoveEffectMapping, getUpdatedMoveMapping, readMoves } from "../../proto_compiler.js"
import { MoveBehavior, MoveBehaviorSchema } from "../../gen/MoveBehavior_pb.js"
import { MoveEffectSchema } from "../../gen/MoveEffect_pb.js"

export const sheerForceBannedEffects = {
  "EFFECT_PAY_DAY": true,
  "EFFECT_TRAP": true,
  "EFFECT_RAMPAGE": true,
  "EFFECT_STEALTH_ROCK_HIT": true,
  "EFFECT_SMACK_DOWN": true,
  "EFFECT_OVERHEAT": true,
  "EFFECT_CLOSE_COMBAT": true,
  "EFFECT_CLEAR_SMOG": true,
  "EFFECT_INCINERATE": true,
  "EFFECT_KNOCK_OFF": true,
  "EFFECT_THIEF": true,
  "EFFECT_NIGHTMARE": true,
  "EFFECT_CREEPING_THORNS_HIT": true,
  "EFFECT_WAKE_UP_SLAP": true,
  "EFFECT_HAMMER_ARM": true,
  "EFFECT_FEINT": true,
  "EFFECT_BUG_BITE": true,
  "EFFECT_FLING": true,
  "EFFECT_FLAME_BURST": true,
  "EFFECT_V_CREATE": true,
  "EFFECT_HIT_PREVENT_ESCAPE": true,
  "EFFECT_HYPERSPACE_FURY": true,
  "EFFECT_BURN_UP": true,
  "EFFECT_SPECTRAL_THIEF": true,
  "EFFECT_CORROSIVE_GAS": true,
  "EFFECT_STICKY_WEB_HIT": true,
  "EFFECT_REMOVE_TERRAIN_NO_FAIL": true,
  "EFFECT_MISC_HIT": true,
  "EFFECT_SPIKE_HIT": true,
  "EFFECT_TREPIDATION": true,
  "EFFECT_PLACEHOLDER": true,
}

export const sheerForceBannedMoveEffects = {
  "MOVE_EFFECT_FEINT": true,
  "MOVE_EFFECT_WATER_PLEDGE": true,
  "MOVE_EFFECT_FIRE_PLEDGE": true,
  "MOVE_EFFECT_GRASS_PLEDGE": true,
  "MOVE_EFFECT_SCALE_SHOT": true,
  "MOVE_EFFECT_WYRM_WIND": true,
  "MOVE_EFFECT_GLAIVE_RUSH": true,
  "MOVE_EFFECT_SALT_CURE": true,
  "MOVE_EFFECT_PREVENT_ESCAPE": true,
}
export const flinchEffects = {
  "EFFECT_FLINCH_HIT": true,
  "EFFECT_TWISTER": true,
  "EFFECT_TRIPLE_ARROWS": true,
  "EFFECT_FAKE_OUT": true,
  "EFFECT_FLINCH_MINIMIZE_HIT": true,
  "EFFECT_FLINCH_STATUS": true,
  "EFFECT_FLINCH_RECOIL_33": true,
  "EFFECT_FLINCH_RECOIL_50": true,
  "EFFECT_SNORE": true,
}

export const kingsRockBanned = {
  "EFFECT_COUNTER": true,
  "EFFECT_MIRROR_COAT": true,
  "EFFECT_FUTURE_SIGHT": true,
  "EFFECT_NATURAL_GIFT": true,
  "EFFECT_METAL_BURST": true,
  "EFFECT_FLING": true,
  "EFFECT_UPPER_HAND": true,
  "EFFECT_PLACEHOLDER": true,
}

export const flinchMoveEffects = {
  "MOVE_EFFECT_FLINCH": true,
}

interface Description {
  ptrDesc: string,
  desc: string,
}

function initDescription(): Description {
  return {
    ptrDesc: "",
    desc: "",
  }
}

export interface Move {
  NAME: string,
  name: string,
  shortName: string,
  effect: string,
  power: number,
  types: string[],
  acc: number,
  pp: number,
  chance: number,
  target: string,
  priority: number,
  flags: string[],
  split: string,
  splitModifier: SplitFlag,
  argument: string,
  desc: string,
  descPtr: string,
  longDesc: string,
  longDescPtr: string,
}

function initMove(): Move {
  return {
    NAME: "",
    name: "",
    shortName: "",
    effect: "",
    power: 0,
    types: [],
    acc: 100,
    pp: 0,
    chance: 0,
    target: "",
    priority: 0,
    flags: [],
    split: "",
    splitModifier: SplitFlag.USE_BASE_SPLIT,
    argument: "",
    desc: "",
    descPtr: "",
    longDesc: "",
    longDescPtr: "",
  }
}

interface Context {
  stopRead: boolean,
  execFlag: string,
  stage: { [key: string]: (line: string, context: Context) => void },
  moves: Map<string, Move>,
  currMove: Move,
  Descs: Map<string, Description>,
  currDesc: Description,
  LongDesc: Map<string, Description>,
  currLongDesc: Description,
}

function initContext(): Context {
  return {
    stopRead: false,
    execFlag: "",
    stage: stageBattleMovesExecutionMap,
    moves: new Map(),
    currMove: initMove(),
    Descs: new Map(),
    currDesc: initDescription(),
    LongDesc: new Map(),
    currLongDesc: initDescription(),
  }
}

const stageBattleMovesExecutionMap: { [key: string]: (line: string, context: Context) => void } = {
  "": (line, context) => {
    if (line.match('gBattleMoves')) context.execFlag = "moves"
  },
  "moves": (line, context) => {
    line = line.replace(/\s/g, '')
    if (line.match(/\[MOVE/)) {
      if (context.currMove.name) {
        if (!context.currMove.types.length) context.currMove.types = ["Normal"] // default value
        context.moves.set(context.currMove.name, context.currMove)
        context.currMove = initMove()
      }
      context.currMove.name = context.currMove.NAME = regexGrabStr(line, /MOVE_\w+/)
    } else if (line.match('.effect')) {
      context.currMove.effect = Xtox('EFFECT_', regexGrabStr(line, /EFFECT_\w+/))
    } else if (line.match('.power')) {
      context.currMove.power = regexGrabNum(line, /(?<==)\d+/)
    } else if (line.match('.type')) {
      context.currMove.types.push(Xtox('TYPE_', regexGrabStr(line, /TYPE_\w+/)))
    } else if (line.match('.acc')) {
      context.currMove.acc = regexGrabNum(line, /(?<==)\d+/, 100)
    } else if (line.match('.pp')) {
      context.currMove.pp = regexGrabNum(line, /(?<==)\d+/, 0)
    } else if (line.match('.secondary')) {
      context.currMove.chance = regexGrabNum(line, /(?<==)\d+/, 0)
    } else if (line.match('.target')) {
      context.currMove.target = regexGrabStr(line, /(?<==)\w+/).replace(/^MOVE_TARGET_/, '')
    } else if (line.match('.priority')) {
      context.currMove.priority = regexGrabNum(line, /(?<==)[\d-]+/, 0)
    } else if (line.match('.flags')) {
      context.currMove.flags = context.currMove.flags.concat(regexGrabStr(line, /(?<==)[^,]+/)
        .split("|")
        .map((x) => Xtox('FLAG_', x))
        .filter(x => x !== "0"))
    } else if (line.match('.splitFlag')) {
      context.currMove.splitModifier = SplitFlag[regexGrabStr(line, /(?<==)\w+/)]
    } else if (line.match('.split')) {
      context.currMove.split = regexGrabStr(line, /(?<==)\w+/).replace(/^SPLIT_/, '')
    } else if (line.match('.argument')) {
      context.currMove.argument = regexGrabStr(line, /(?<==)\w+(\s*\|\s*\w+)*/)
    } else if (line.match(/\.\w+=TRUE/)) {
      context.currMove.flags.push(regexGrabStr(line, /(?<=\.)\w+/))
    } else if (line.match(/};/)) {
      if (context.currMove.name) {
        if (!context.currMove.types.length) context.currMove.types = ["Normal"] // default value
        context.moves.set(context.currMove.name, context.currMove)
      }
      context.stage = stageDescriptionExecutionMap
      context.execFlag = "desc"
      return
    }
  }
}

const stageDescriptionExecutionMap: { [key: string]: (line: string, context: Context) => void } = {
  "desc": (line, context) => {
    if (line.match('u8 s')) {
      if (context.currDesc.ptrDesc !== "") {
        context.Descs.set(context.currDesc.ptrDesc, context.currDesc)
        context.currDesc = initDescription()
      }
      context.currDesc.ptrDesc = regexGrabStr(line, /s\w+(?=\[)/)
    } else if (line.match('^"')) {
      context.currDesc.desc += regexGrabStr(line, /(?<=")[^"]+/).replace('\\n', ' ')
    } else if (line.match(/gMoveDescriptionPointers/)) {
      context.execFlag = "descToMove"
      return
    }
  },
  "descToMove": (line, context) => {
    line = line.replace(/\s/g, '')
    if (line.match(/^\[/)) {
      const moveName = regexGrabStr(line, /(?<=\[)\w+/)
      if (!context.moves.has(moveName)) return
      const move = context.moves.get(moveName)
      if (!move) return
      move.descPtr = regexGrabStr(line, /(?<==)\w+/)
      if (!context.Descs.has(move.descPtr)) return
      move.desc = context.Descs.get(move.descPtr)?.desc || ""
      context.moves.set(moveName, move)
    } else if (line.match(/};/)) {
      context.execFlag = "descFourLine"
    }
  },
  "descFourLine": (line, context) => {
    if (line.match('u8 s')) {
      if (context.currLongDesc.ptrDesc !== "") {
        context.LongDesc.set(context.currLongDesc.ptrDesc, context.currLongDesc)
        context.currLongDesc = initDescription()
      }
      context.currLongDesc.ptrDesc = regexGrabStr(line, /\w+(?=\[)/)
      context.currLongDesc.desc = regexGrabStr(line, /(?<=")[^"]+/).replace(/\\n/g, ' ')
    } else if (line.match('gMoveFourLineDescriptionPointers')) {
      context.execFlag = "descFourLineToMove"
    }

  },
  "descFourLineToMove": (line, context) => {
    line = line.replace(/\s/g, '')
    if (line.match(/^\[/)) {
      const moveName = regexGrabStr(line, /(?<=\[)\w+/)
      if (!context.moves.has(moveName)) return
      const move = context.moves.get(moveName)
      if (!move) return
      move.longDescPtr = regexGrabStr(line, /(?<==)\w+/)
      if (!context.LongDesc.has(move.longDescPtr)) return
      move.longDesc = context.LongDesc.get(move.longDescPtr)?.desc || ""
      context.moves.set(moveName, move)
    } else if (line.match(/};/)) {
      context.stage = stageNameExecutionMap
      context.execFlag = ""
      return
    }
  }
}

const stageNameExecutionMap: { [key: string]: (line: string, context: Context) => void } = {
  "": (line, context) => {
    if (line.match(/gMoveNames/)) context.execFlag = "movesName"
  },
  "movesName": (line, context) => {
    line = line.replace(/\s/g, '')
    if (line.match(/^\[/)) {
      const moveName = regexGrabStr(line, /(?<=\[)\w+/)
      const IGName = regexGrabStr(line, /(?<=")[^"]+/)
      if (!context.moves.has(moveName)) return
      const move = context.moves.get(moveName)
      if (!move) return
      move.shortName = IGName
      context.moves.set(moveName, move)
    } else if (line.match(/};/)) {
      context.execFlag = "awaitNamesLong"
      return
    }

  },
  "awaitNamesLong": (line, context) => {
    if (line.match('gMoveNamesLong')) {
      context.execFlag = "movesNameLong"
      return
    }
  },
  "movesNameLong": (line, context) => {
    if (line.match(/^\[/)) {
      const moveName = regexGrabStr(line, /(?<=\[)\w+/)
      const IGName = regexGrabStr(line, /(?<=")[^"]+/)
      if (!context.moves.has(moveName)) return
      const move = context.moves.get(moveName)
      if (!move) return
      move.name = IGName
      context.moves.set(moveName, move)
    } else if (line.match(/};/)) {
      context.stopRead = true
      return
    }
  }
}

export function parse(filedata: string): Map<string, Move> {
  const lines = filedata.split('\n')

  const context = initContext()

  for (let line of lines) {
    line = line.trim()
    if (line == "") continue
    context.stage[context.execFlag](line, context)
    if (context.stopRead) break
  }
  return context.moves
}

export function convertLegacyMove(legacyMove: Move): ProtoMove {
  function hasFlag(flag) {
    if (flag.includes("_")) flag = Xtox("FLAG_", flag)
    return legacyMove.flags.includes(flag)
  }
  const move = create(MoveSchema, {
    id: MoveEnum[legacyMove.NAME],
    name: legacyMove.name,
    shortName: legacyMove.shortName,
    description: legacyMove.longDesc,
    shortDescription: legacyMove.desc,
    effect: MoveBehavior["EFFECT_" + legacyMove.effect.replace(" ", "_").replace(" ", "_").replace(" ", "_").replace(" ", "_").toUpperCase()],
    split: MoveSplit[legacyMove.split],
    type: Type[legacyMove.types[0].toUpperCase()],
    type2: (legacyMove.types.length > 1) ? Type[legacyMove.types[1].toUpperCase()] : Type.NONE,
    target: MoveTarget[legacyMove.target],
    power: legacyMove.power,
    accuracy: legacyMove.acc,
    pp: legacyMove.pp,
    effectChance: legacyMove.chance,
    priority: legacyMove.priority,
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
    noKingsRock: !hasFlag("FLAG_KINGS_ROCK_AFFECTED") && legacyMove.split !== "STATUS",
    reckless: hasFlag("FLAG_RECKLESS_BOOST"),
    ironFist: hasFlag("FLAG_IRON_FIST_BOOST"),
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
    splitModifier: legacyMove.splitModifier,
  })

  if (!move.effect && legacyMove.effect !== "Hit") console.log(legacyMove.effect)

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

  if (legacyMove.argument) {
    const argumentWrapper = create(ArgumentSchema)
    if (legacyMove.argument.startsWith("TYPE_")) {
      argumentWrapper.argument = {
        case: "type",
        value: Type[legacyMove.argument.substring("TYPE_".length)]
      }
    } else if (legacyMove.argument.startsWith("STATUS1_")) {
      argumentWrapper.argument = {
        case: "status",
        value: Status[legacyMove.argument]
      }
    } else if (legacyMove.argument.startsWith("MISC_EFFECT_")) {
      argumentWrapper.argument = {
        case: "misc",
        value: MiscMoveEffect[legacyMove.argument]
      }
    } else if (legacyMove.argument.startsWith("MOVE_EFFECT_")) {
      argumentWrapper.argument = {
        case: "effect",
        value: create(MoveEffectArgumentSchema, {
          affectsUser: legacyMove.argument.includes("MOVE_EFFECT_AFFECTS_USER"),
          certain: legacyMove.argument.includes("MOVE_EFFECT_CERTAIN"),
          effect: MoveBehavior[legacyMove.argument.trimStart().split("|")[0]]
        })
      }
    } else if (!isNaN(parseInt(legacyMove.argument))) {
      argumentWrapper.argument = {
        case: "int",
        value: parseInt(legacyMove.argument),
      }
    } else {
      argumentWrapper.argument = {
        case: "other",
        value: legacyMove.argument
      }
    }
    move.argument = argumentWrapper
  }

  if (move.name === "Overheat") {
    console.log(MoveBehaviorSchema.value[move.effect].name, move.effect)
  }

  let noSheerForce = !hasFlag("FLAG_SHEER_FORCE_BOOST") && legacyMove.split !== "STATUS" && legacyMove.chance > 0 && !sheerForceBannedEffects[MoveBehaviorSchema.value[move.effect].name]

  if (noSheerForce && !(move.argument?.argument.case === "effect" && sheerForceBannedMoveEffects[MoveEffectSchema.value[move.argument.argument.value.effect].name])) {
    move.noSheerForce = true
  }

  if (move.noKingsRock && move.effectChance) {
    if (flinchEffects[MoveBehaviorSchema.value[move.effect].name]) {
      move.noKingsRock = false
    } else if (move.argument?.argument.case === "effect" && flinchMoveEffects[MoveEffectSchema.value[move.argument.argument.value.effect].name]) {
      move.noKingsRock = false
    }
  }

  if (move.noKingsRock && kingsRockBanned[MoveBehaviorSchema.value[move.effect].name]) move.noKingsRock = false

  if (move.name.length < 13 && move.id) move.shortName = move.name

  return move
}

function protoMoveToLegacyMove(move: ProtoMove, updatedMoveMapping: Map<MoveEnum, string>, updatedMoveEffectMapping: Map<MoveBehavior, string>): [string, Move] {
  const legacyMove: Move = {
    NAME: updatedMoveMapping.get(move.id) || "MOVE_NONE",
    name: move.name,
    shortName: move.shortName,
    effect: Xtox("EFFECT_", updatedMoveEffectMapping.get(move.effect) || "EFFECT_HIT"),
    power: move.power,
    types: (move.type2 ? [Type[move.type || 0] || "MYSTERY", Type[move.type2]] : [Type[move.type || 0] || "MYSTERY"]).map(it => Xtox("TYPE_", it)),
    acc: move.accuracy,
    pp: move.pp,
    chance: move.effectChance,
    target: MoveTarget[move.target || 0],
    priority: move.priority,
    flags: [],
    split: MoveSplit[move.split || 0],
    splitModifier: SplitFlag.USE_BASE_SPLIT,
    argument: "",
    desc: move.shortDescription,
    descPtr: "PTRSHORT" + move.id,
    longDesc: move.description,
    longDescPtr: "PTRLONG" + move.id
  }

  for (const field of MoveSchema.fields) {
    if (getOption(field, is_flag) && move[field.name]) {
      if (field.enum) {
        legacyMove.flags.push(getOption(field.enum.value[move[field.name]], enum_name))
      } else {
        legacyMove.flags.push(getOption(field, field_name))
      }
    }
  }

  return [legacyMove.NAME, legacyMove]
}

export function getMoves(ROOT_PRJ: string, gameData: GameData) {
  gameData.moveList = readMoves(ROOT_PRJ)
  const moveEnumMapping = gameData.moveEnumMap
  const moveEffectMapping = getUpdatedMoveEffectMapping(ROOT_PRJ)
  gameData.moves = new Map(gameData.moveList.moves.map(it => protoMoveToLegacyMove(it, moveEnumMapping, moveEffectMapping)))
}

export function getLegacyMoves(ROOT_PRJ: string, optionsGlobal_h: FileDataOptions, gameData: GameData): Promise<void> {
  return new Promise((resolve: () => void, reject) => {
    getFileData(join(ROOT_PRJ, 'include/constants/battle_config.h'), optionsGlobal_h)
      .then((battle_config) => {
        const optionsBattle = {
          filterComments: true,
          filterMacros: true,
          macros: battle_config.macros
        }
        getMulFilesData(autojoinFilePath(ROOT_PRJ, ['src/data/battle_moves.h',
          'src/data/text/move_descriptions.h',
          'src/data/text/move_names.h']), optionsBattle)
          .then((movesData) => {
            gameData.moves = parse(movesData)
            resolve()
          })
          .catch(reject)

      })
      .catch(reject)
  })

}
