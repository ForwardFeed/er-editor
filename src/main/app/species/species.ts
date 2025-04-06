import * as SpeciesNames from './species_names'
import * as BaseStats from './base_stats'
import * as Evolutions from './evolutions'
import * as EggMoves from './egg_moves'
import * as LevelUpLearnSets from './level_up_learnsets'
//import * as TMHMLearnsets from './tmhm_learnsets'
import * as TutorMoves from './tutor_learnsets'
import * as FormsSpecies from './form_species'
import * as PokePokedex from './pokedex'
import * as Sprites from './sprites'

import { FileDataOptions, getMulFilesData, autojoinFilePath } from '../utils'
import { GameData } from '../main'
import { readSpecies } from '../../proto_compiler.js'
import { SpeciesEnum } from '../../gen/SpeciesEnum_pb.js'
import { Evolution } from './evolutions'
import { BodyColor, EggGroup, Species, Species_Gender, Species_Learnset, Species_Learnset_UniversalTutors, Species_LearnsetSchema, Species_SpeciesDexInfo, Species_SpeciesDexInfoSchema, SpeciesList } from '../../gen/SpeciesList_pb.js'
import { Xtox } from '../parse_utils.js'
import { Type } from '../../gen/Types_pb.js'
import { inspect } from 'util'
import { create } from '@bufbuild/protobuf'
import { LevelUpMove } from './level_up_learnsets'

export interface Specie {
  NAME: string,
  name: string,
  baseStats: BaseStats.BaseStats,
  evolutions: Evolutions.Evolution[],
  eggmoves: string[],
  learnset: LevelUpLearnSets.LevelUpMove[],
  tutorMoves: string[],
  tmhm: string[],
  forms: string[],
  dex: PokePokedex.PokePokedex
  sprite: string, //sprite relative path
  lrnPtr: string,
}

function parse(pokeData: string): Specie[] {
  const lines = pokeData.split('\n')
  const pokePokedexResult = PokePokedex.parse(lines, 0)
  const speciesNamesResult = SpeciesNames.parse(lines, pokePokedexResult.fileIterator)
  const baseStatsResult = BaseStats.parse(lines, speciesNamesResult.fileIterator)
  const evolutionsResult = Evolutions.parse(lines, baseStatsResult.fileIterator)
  const eggmovesResult = EggMoves.parse(lines, evolutionsResult.fileIterator)
  const levelUpLearnsetsResult = LevelUpLearnSets.parse(lines, eggmovesResult.fileIterator)
  //const TMHMLearnsetsResult = TMHMLearnsets.parse(lines, levelUpLearnsetsResult.fileIterator)
  //const TutorMovesResult = TutorMoves.parse(lines, TMHMLearnsetsResult.fileIterator)
  const TutorMovesResult = TutorMoves.parse(lines, levelUpLearnsetsResult.fileIterator)
  const formsResult = FormsSpecies.parse(lines, TutorMovesResult.fileIterator)
  const spritesResult = Sprites.parse(lines, formsResult.fileIterator)

  const species: Specie[] = []
  baseStatsResult.baseStats.forEach((BaseStats, key) => {
    species.push({
      NAME: key,
      name: speciesNamesResult.names.get(key) || "undefined",
      baseStats: BaseStats,
      evolutions: evolutionsResult.evolutions.get(key) || [],
      eggmoves: eggmovesResult.eggmoves.get(key) || [],
      learnset: levelUpLearnsetsResult.levelLearnsets.get(key) || [],
      tmhm: /*TMHMLearnsetsResult.tmhmLearnsets.get(key)||*/[],
      tutorMoves: TutorMovesResult.tutorMoves.get(key) || [],
      forms: formsResult.forms.get(key) || [],
      dex: pokePokedexResult.data.get(key) || {} as PokePokedex.PokePokedex,
      sprite: spritesResult.spritesPath.get(key) || "",
      lrnPtr: levelUpLearnsetsResult.lrnPtr.get(key) || ""
    })
  })
  return species
}

export function createEvoMapping(gameData: GameData): Map<SpeciesEnum, [Evolution[], string[]]> {
  const evoMap = new Map<SpeciesEnum, [Evolution[], string[]]>(gameData.speciesList.species.map<[SpeciesEnum, [Evolution[], string[]]]>(it => [it.id, [[], []]]))

  for (const species of gameData.speciesList.species) {
    const evos = evoMap.get(species.id)!![0]
    for (const evo of species.evo) {
      evos.push({
        kind: evo.gender ? "EVO_LEVEL_" + Species_Gender[evo.gender] : "EVO_LEVEL",
        specifier: evo.level.toString(),
        into: gameData.speciesEnumMap.get(evo.to)!!,
      })
    }

    for (const mega of species.mega) {
      evoMap.get(mega.from)!![0].push({
        kind: mega.evoUsing.case === "move" ? "EVO_MOVE_MEGA_EVOLUTION" : "EVO_MEGA_EVOLUTION",
        specifier: mega.evoUsing.case === "move" ? gameData.moveEnumMap.get(mega.evoUsing.value)!! : mega.evoUsing.value || "",
        into: gameData.speciesEnumMap.get(species.id)!!
      })
    }

    for (const primal of species.primal) {
      evoMap.get(primal.from)!![0].push({
        kind: "EVO_PRIMAL_REVERSION",
        specifier: primal.item,
        into: gameData.speciesEnumMap.get(species.id)!!
      })
    }

    if (species.formShiftOf) {
      evoMap.get(species.formShiftOf)!![1].push(gameData.speciesEnumMap.get(species.id)!!)
    }
  }
  return evoMap
}

export function getBaseSpecies(species: Species, speciesMap: Map<SpeciesEnum, Species>): Species_SpeciesDexInfo {
  if (!species.id) return create(Species_SpeciesDexInfoSchema)

  switch (species.baseSpeciesInfo.case) {
    case "dex":
      return species.baseSpeciesInfo.value
    case "formOf":
      return getBaseSpecies(speciesMap.get(species.baseSpeciesInfo.value)!!, speciesMap)
    default:
      return create(Species_SpeciesDexInfoSchema)
  }
}

export function getLearnsetMon(species: Species, speciesMap: Map<SpeciesEnum, Species>): Species {
  if (species.id === SpeciesEnum.SPECIES_NONE) return species
  if (species.learnsetOrRef.case === "learnset") return species
  if (species.learnsetOrRef.value) return getLearnsetMon(speciesMap.get(species.learnsetOrRef.value)!!, speciesMap)
  if (species.formShiftOf) return getLearnsetMon(speciesMap.get(species.formShiftOf)!!, speciesMap)
  if (species.mega.length) return getLearnsetMon(speciesMap.get(species.mega[0].from)!!, speciesMap)
  if (species.primal.length) return getLearnsetMon(speciesMap.get(species.primal[0].from)!!, speciesMap)
  if (!species.learnsetOrRef.value) return species
  return getLearnsetMon(speciesMap.get(species.learnsetOrRef.value)!!, speciesMap)
}

export function getUniversalTutors(type: Species_Learnset_UniversalTutors, isGenderless: boolean): string[] {
  const tutors = ["MOVE_ENDURE", "MOVE_HELPING_HAND", "MOVE_PROTECT", "MOVE_REST", "MOVE_SLEEP_TALK", "MOVE_SUBSTITUTE"]
  if (type !== Species_Learnset_UniversalTutors.NO_ATTACKS) {
    tutors.push("MOVE_HIDDEN_POWER", "MOVE_SECRET_POWER", "MOVE_RETURN")
  }
  if (!isGenderless) {
    tutors.push("MOVE_ATTRACT")
  }
  return tutors
}

function getSprite(species: Species, speciesMap: Map<SpeciesEnum, Species>): string {
  if (species.visualsOr.case === "reuseVisuals") {
    return getSprite(speciesMap.get(species.visualsOr.value)!!, speciesMap)
  }

  if (!species.visualsOr.value) return ""
  if (species.visualsOr.value.front) return "graphics/pokemon/" + species.visualsOr.value.front.path + ".png"
  return ""
}

export function toSpeciesMap(speciesList: SpeciesList): Map<SpeciesEnum, Species> {
  return new Map(speciesList.species.map(it => [it.id, it]))
}

export function getSpecies(ROOT_PRJ: string, gameData: GameData) {
  gameData.speciesList = readSpecies(ROOT_PRJ)
  const updatedSpeciesEnum = gameData.speciesEnumMap
  const updatedMoveEnum = gameData.moveEnumMap
  const updatedAbilityMapping = gameData.abilityEnumMap
  const evoMap = createEvoMapping(gameData)
  const speciesMap = gameData.speciesMap = toSpeciesMap(gameData.speciesList)

  gameData.species = []
  for (const species of gameData.speciesList.species) {
    if (species.id === SpeciesEnum.SPECIES_EGG) continue
    const baseSpeciesInfo = getBaseSpecies(species, speciesMap)

    const learnsetSpecies = getLearnsetMon(species, speciesMap)
    const learnset = learnsetSpecies.learnsetOrRef.value as Species_Learnset || create(Species_LearnsetSchema)

    gameData.species.push({
      NAME: updatedSpeciesEnum.get(species.id)!!,
      name: Xtox("SPECIES_", updatedSpeciesEnum.get(species.id)!!),
      baseStats: {
        baseHP: species.hp,
        baseAttack: species.atk,
        baseDefense: species.def,
        baseSpeed: species.spe,
        baseSpAttack: species.spatk,
        baseSpDefense: species.spdef,
        types: [Xtox('', Type[species.type]), Xtox('', Type[species.type2 ? species.type2 : species.type])],
        catchRate: 0,
        expYield: 0,
        evYield_HP: 0,
        evYield_Attack: 0,
        evYield_Defense: 0,
        evYield_Speed: 0,
        evYield_SpAttack: 0,
        evYield_SpDefense: 0,
        items: [],
        genderRatio: species.gender.case === "genderless" ? 255 : Math.floor(254 * (species.gender.value || 0)),
        eggCycles: 0,
        friendship: 0,
        growthRate: '',
        eggGroup: [baseSpeciesInfo.eggGroup, baseSpeciesInfo.eggGroup2].filter(it => it != EggGroup.EGG_GROUP_NONE).map(it => "EGG_GROUP_" + EggGroup[it]),
        abilities: species.ability.map(it => updatedAbilityMapping.get(it)!!),
        innates: species.innate.map(it => updatedAbilityMapping.get(it)!!),
        bodyColor: BodyColor[baseSpeciesInfo.bodyColor || BodyColor.RED],
        noFlip: species.noFlip,
        flags: species.heads === 3 ? "F_THREE_HEADED" : species.heads === 2 ? "F_TWO_HEADED" : ""
      },
      evolutions: evoMap.get(species.id)!![0],
      eggmoves: [],
      learnset: learnset.level.flatMap(levelGroup => levelGroup.move.map<LevelUpMove>(it => { return { level: levelGroup.level, move: updatedMoveEnum.get(it)!! } })),
      tutorMoves: learnset.tutor.map(it => updatedMoveEnum.get(it)!!).concat(...getUniversalTutors(learnset.universalTutors, species.gender.case === "genderless")),
      tmhm: [],
      forms: evoMap.get(species.id)!![1],
      dex: {
        id: baseSpeciesInfo.nationalDexNum,
        desc: baseSpeciesInfo.description,
        descPtr: "DEXPTR" + baseSpeciesInfo.name,
        hw: [baseSpeciesInfo.height, baseSpeciesInfo.weight]
      },
      sprite: getSprite(species, speciesMap),
      lrnPtr: "LRNSETPTR" + learnsetSpecies.id
    })

    gameData.species[gameData.species.length - 1].tutorMoves.sort()

  }
}

export function getLegacySpecies(ROOT_PRJ: string, optionsGlobal_h: FileDataOptions, gameData: GameData): Promise<void> {
  return new Promise((resolve: () => void, reject) => {
    getMulFilesData(autojoinFilePath(ROOT_PRJ, [
      'src/data/pokemon/pokedex_text.h', //both goes together with entries
      'src/data/pokemon/pokedex_entries.h',
      'src/data/text/species_names.h',
      'src/data/pokemon/base_stats.h',
      'src/data/pokemon/evolution.h',
      'src/data/pokemon/egg_moves.h',
      'src/data/pokemon/level_up_learnsets.h', // order with pointers is important
      'src/data/pokemon/level_up_learnset_pointers.h',
      //'src/data/pokemon/tmhm_learnsets.h',
      'src/data/pokemon/tutor_learnsets.h',
      'src/data/pokemon/form_species_tables.h',
      'src/data/pokemon/form_species_table_pointers.h',
      '#src/data/graphics/pokemon.h',
      'src/data/pokemon_graphics/front_pic_table.h',
    ]), optionsGlobal_h)
      .then((pokeData) => {
        gameData.species = parse(pokeData)
        console.log(inspect(gameData.species.slice(1500), { showHidden: false, depth: null, colors: true }))
        resolve()
      })
      .catch((reason) => {
        const err = 'Failed at getting species reason: ' + reason
        reject(err)
      })
  })
}
