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

function parse(pokeData: string): Specie[]{
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
    baseStatsResult.baseStats.forEach((BaseStats, key)=>{
        species.push({
            NAME: key,
            name: speciesNamesResult.names.get(key) || "undefined",
            baseStats: BaseStats,
            evolutions: evolutionsResult.evolutions.get(key) || [],
            eggmoves: eggmovesResult.eggmoves.get(key) || [],
            learnset: levelUpLearnsetsResult.levelLearnsets.get(key) || [],
            tmhm: /*TMHMLearnsetsResult.tmhmLearnsets.get(key)||*/ [],
            tutorMoves: TutorMovesResult.tutorMoves.get(key) || [],
            forms: formsResult.forms.get(key) || [],
            dex: pokePokedexResult.data.get(key) || {} as PokePokedex.PokePokedex,
            sprite: spritesResult.spritesPath.get(key) || "",
            lrnPtr: levelUpLearnsetsResult.lrnPtr.get(key) || ""
        })
    })
    return species
}

export function getSpecies(ROOT_PRJ: string, optionsGlobal_h: FileDataOptions, gameData: GameData): Promise<void>{
    return new Promise((resolve: ()=>void, reject)=>{
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
        .then((pokeData)=>{
            gameData.species = parse(pokeData)
            resolve()
        })
        .catch((reason)=>{
            const err = 'Failed at getting species reason: ' + reason
            reject(err)
        })
    })
}
