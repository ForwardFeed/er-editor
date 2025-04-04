import { gameData } from '../main'
import { configuration } from '../configuration'
import { Evolution } from '../species/evolutions'
import { LevelUpMove } from '../species/level_up_learnsets'
import { writeSpecies } from '../../proto_compiler'
import { createEvoMapping, getBaseSpecies, getLearnsetMon, getUniversalTutors } from '../species/species.js'
import { create } from '@bufbuild/protobuf'
import { Species, Species_EvolutionSchema, Species_Gender, Species_Learnset, Species_Learnset_LevelUpMoveSchema, Species_LearnsetSchema, Species_MegaEvolutionSchema, Species_PrimalEvolution, Species_PrimalEvolution_PrimalType, Species_PrimalEvolutionSchema } from './gen/SpeciesList_pb.js'
import { CallQueue } from '../../call_queue.js'
import { MoveEnum } from '../../gen/MoveEnum_pb.js'
import { Type } from '../../gen/Types_pb.js'
import { Species_MegaEvolution_MegaType } from '../../gen/SpeciesList_pb.js'

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

function megaEvoFromEvolution(evo: Evolution, from: Species, moveEnumMap: Map<string, MoveEnum>, type?: Species_MegaEvolution_MegaType) {
  const megaEvo = create(Species_MegaEvolutionSchema, { from: from.id })
  if (type === undefined) {
    const pieces = evo.into.split("_")
    if (pieces.includes("X")) type = Species_MegaEvolution_MegaType.MEGA_X
    else if (pieces.includes("Y")) type = Species_MegaEvolution_MegaType.MEGA_Y
    else if (pieces.includes("Z")) type = Species_MegaEvolution_MegaType.MEGA_Z
    else if (pieces.includes("A")) type = Species_MegaEvolution_MegaType.MEGA_A
    else if (pieces.includes("B")) type = Species_MegaEvolution_MegaType.MEGA_B
    else if (pieces.includes("C")) type = Species_MegaEvolution_MegaType.MEGA_C
    else type = Species_MegaEvolution_MegaType.MEGA_UNSPECIFIED
  }
  if (evo.kind === "EVO_MEGA_EVOLUTION") {
    megaEvo.evoUsing = {
      case: "item",
      value: evo.specifier,
      type: type,
    }
  } else {
    megaEvo.evoUsing = {
      case: "move",
      value: moveEnumMap.get(evo.specifier)!!,
      type: type,
    }
  }
  return megaEvo
}

function primalEvoFromEvolution(evo: Evolution, from: Species): Species_PrimalEvolution {
  return create(Species_PrimalEvolutionSchema, {
    from: from.id,
    item: evo.specifier,
    type: evo.into.includes("_CROWNED") ? Species_PrimalEvolution_PrimalType.CROWNED
      : evo.into.endsWith("_ORIGIN") ? Species_PrimalEvolution_PrimalType.ORIGIN
        : Species_PrimalEvolution_PrimalType.PRIMAL
  })
}

export function updateEvos(specie: string, evos: Evolution[]) {
  const evolutionMap = createEvoMapping(gameData)
  const speciesEnumMap = invertMap(gameData.speciesEnumMap)
  const moveEnumMap = invertMap(gameData.moveEnumMap)
  const species = gameData.speciesMap.get(speciesEnumMap.get(specie)!!)!!
  species.evo = evos.filter(it => it.kind.startsWith("EVO_LEVEL")).map(it => create(Species_EvolutionSchema, {
    to: speciesEnumMap.get(it.into),
    gender: it.kind === "EVO_LEVEL_MALE" ? Species_Gender.MALE : it.kind === "EVO_LEVEL_FEMALE" ? Species_Gender.FEMALE : undefined,
    level: +it.specifier,
  })
  )
  const megas = new Map(evolutionMap.get(species.id)!![0].filter(it => !it.kind.startsWith("EVO_LEVEL")).map(it => [it.into, it]))
  const newMegas = new Map(evos.filter(it => !it.kind.startsWith("EVO_LEVEL")).map(it => [it.into, it]))
  for (const [to, evo] of newMegas.entries()) {
    const oldMega = megas.get(to)
    const toSpecies = gameData.speciesMap.get(speciesEnumMap.get(to)!!)!!
    if (oldMega) {
      if (oldMega.kind === evo.kind && oldMega.specifier === evo.specifier) continue
      if (evo.kind.startsWith("EVO_MEGA") && oldMega.kind.startsWith("EVO_MEGA")) {
        megas.delete(to)
        toSpecies.mega = toSpecies.mega.map(it => it.from !== species.id ? it : megaEvoFromEvolution(evo, species, moveEnumMap, it.type))
        continue
      }

      if (evo.kind.startsWith("EVO_PRIMAL") && oldMega.kind.startsWith("EVO_PRIMAL")) {
        megas.delete(to)
        toSpecies.primal = toSpecies.primal.map(it => it.from !== species.id ? it : primalEvoFromEvolution(evo, species))
        continue
      }
    }

    if (evo.kind.startsWith("EVO_MEGA")) {
      toSpecies.mega.push(megaEvoFromEvolution(evo, species, moveEnumMap))
    } else {
      toSpecies.primal.push(primalEvoFromEvolution(evo, species))
    }
  }

  for (const [to, evo] of megas.entries()) {
    const toSpecies = gameData.speciesMap.get(speciesEnumMap.get(to)!!)!!
    if (evo.kind.startsWith("EVO_MEGA")) {
      toSpecies.mega = toSpecies.mega.filter(it => it.from !== species.id)
    } else {
      toSpecies.primal = toSpecies.primal.filter(it => it.from !== species.id)
    }
  }

  markSpeciesDirty()
}

export function updateTutors(specie: string, moves: string[]) {
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
}

export function updateLearnset(specie: string, moves: LevelUpMove[]) {
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
}

export function updateAbilities(specie: string, field: "abis" | "inns", abis: string[]) {
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
}

export function updateBaseStats(specie: string, values: number[]) {
  const speciesMap = invertMap(gameData.speciesEnumMap)
  const species = gameData.speciesMap.get(speciesMap.get(specie)!!)!!
  species.hp = values[0]
  species.atk = values[1]
  species.def = values[2]
  species.spatk = values[3]
  species.spdef = values[4]
  species.spe = values[5]

  markSpeciesDirty()
}

export function udpateSpeciesType(specie, types: [string, string]) {
  const speciesMap = invertMap(gameData.speciesEnumMap)
  const species = gameData.speciesMap.get(speciesMap.get(specie)!!)!!
  species.type = Type[types[0].slice("TYPE_".length)]
  if (types[0] !== types[1]) {
    species.type2 = Type[types[1].slice("TYPE_".length)]
  } else {
    species.type2 = Type.NONE
  }

  markSpeciesDirty()
}

export function updateSpeciesDescription(specie: string, desc: string) {
  const speciesMap = invertMap(gameData.speciesEnumMap)
  const species = getBaseSpecies(gameData.speciesMap.get(speciesMap.get(specie)!!)!!, gameData.speciesMap)
  species.description = desc

  markSpeciesDirty()
}
