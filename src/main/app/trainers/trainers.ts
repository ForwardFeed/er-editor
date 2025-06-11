import { Species_Gender } from "../../gen/SpeciesList_pb.js";
import { TrainerParty_TrainerMon, TrainerParty_TrainerMon_Nature } from "../../gen/TrainerList_pb.js";
import { Type } from "../../gen/Types_pb.js";
import { getUpdatedTrainerClassMapping, getUpdatedTrainerMapping, getUpdatedTrainerMusicMapping, getUpdatedTrainerPicMapping, readTrainers } from "../../proto_compiler.js";
import { GameData } from "../main";
import { autojoinFilePath, getMulFilesData } from "../utils";
import * as TrainerNames from './base_trainer'
import * as Rematches from './rematches'
import * as TrainersTeam from './teams'



export interface Trainer{
    realName: string,
    name: string,
    NAME: string,
    tclass: string,
    double: boolean,
    party: TrainersTeam.TrainerPokemon[],
    insane: TrainersTeam.TrainerPokemon[],
    hell: TrainersTeam.TrainerPokemon[],
    rematches: RematchTrainer[],
    ptr: string,
    ptrInsane: string,
    gender: boolean, // true w*man
    music: string,
    pic: string,
    rematchM: string,
}

export interface RematchTrainer{
    double: boolean,
    party: TrainersTeam.TrainerPokemon[],
    ptr: string,
    NAME: string,
}


function parse(fileData: string): Map<string, Trainer>{
    const lines = fileData.split('\n')
    const RematchesResult = Rematches.parse(lines, 0)
    const TrainerNamesResult = TrainerNames.parse(lines, RematchesResult.fileIterator)
    const TrainersTeamResult = TrainersTeam.parse(lines, TrainerNamesResult.fileIterator)
    const trainers: Map<string, Trainer> = new Map()
    TrainerNamesResult.trainers.forEach((value, key)=>{
        if (RematchesResult.rematched.indexOf(key) != -1) return
        const rematchList = RematchesResult.rematches.get(key) || []
        let rematchM: string= ""
        const rematchs = rematchList.map((x, i)=> {
            const rem = TrainerNamesResult.trainers.get(x)
            if (!i) rematchM = x
            if (!rem) return
            return {
                double: rem.double,
                party: TrainersTeamResult.trainers.get(rem.partyPtr) || [],
                ptr: rem.partyPtr,
                NAME: rem.NAME
            } as RematchTrainer
        }).filter(x => x) as RematchTrainer[]

        trainers.set(value.NAME, {
            name: value.NAME,
            realName: value.name,
            NAME: value.NAME,
            tclass: value.tclass,
            double: value.double,
            party: TrainersTeamResult.trainers.get(value.partyPtr) || [],
            insane: TrainersTeamResult.trainers.get(value.insanePtr) || [],
            hell: [],
            rematches: rematchs,
            ptr: value.partyPtr,
            ptrInsane: value.insanePtr,
            gender: value.gender, // true w*man
            music: value.music,
            pic: value.pic,
            rematchM: rematchM
        })
    })
    return trainers
}

function monToLegacyMon(mon: TrainerParty_TrainerMon, gameData: GameData): TrainersTeam.TrainerPokemon {
    return {
    specie: gameData.speciesEnumMap.get(mon.species)!!,
    ability: Math.max(gameData.speciesMap.get(mon.species)!!.ability.indexOf(mon.ability), 0),
    ivs: [31, 31, 31, 31, 31, mon.ironPill ? 0 : 31],
    evs: [mon.hpEv, mon.atkEv, mon.defEv, mon.spatkEv, mon.spdefEv, mon.speEv],
    item: gameData.itemEnumMap.get(mon.item)!!,
    nature: "NATURE_" + TrainerParty_TrainerMon_Nature[mon.nature],
    moves: mon.move.map(it => gameData.moveEnumMap.get(it)!!),
    hpType: mon.hiddenPowerType ? "TYPE_" + Type[mon.hiddenPowerType] : "",
  }
}

export function getTrainers(ROOT_PRJ: string, gameData: GameData) {
  const trainers = readTrainers(ROOT_PRJ)

  gameData.trainers = new Map()
  for (const trainer of trainers.trainer) {
    const idString = trainerMapping.get(trainer.id)!!
    const aceParty = trainer.ace!!.mon.map(it => monToLegacyMon(it, gameData))
    const eliteParty = trainer.elite?.mon.map(it => monToLegacyMon(it, gameData)) || aceParty
    const hellParty = trainer.hell?.mon.map(it => monToLegacyMon(it, gameData)) || eliteParty
    gameData.trainers.set(idString, {
      name: idString,
      realName: trainer.name,
      NAME: idString,
      tclass: trainerClassMapping.get(trainer.class!!)!!,
      double: trainer.forcedDouble,
      party: aceParty,
      insane: eliteParty,
      hell: hellParty,
      rematches: [],
      ptr: "",
      ptrInsane: "",
      gender: trainer.gender === Species_Gender.FEMALE,
      music: trainerMusicMapping.get(trainer.music!!)!!,
      pic: trainerPicMapping.get(trainer.pic!!)!!,
      rematchM: ""
    })
  }

  gameData.trainerInternalID = new Map()
  for (const [id, name] of trainerMapping.entries()) {
    gameData.trainerInternalID.set(name, id)
  }
}

export function getLegacyTrainers(ROOT_PRJ: string, gameData: GameData): Promise<void>{
    return new Promise((resolve: ()=>void, reject)=>{
        const filepaths = autojoinFilePath(ROOT_PRJ, [
                                                        'src/battle_setup.c',
                                                        'src/data/trainers.h',
                                                        'src/data/trainer_parties.h'])
        getMulFilesData(filepaths, {filterComments: true, filterMacros: true, macros: new Map()})
        .then((fileData)=>{
                gameData.trainers = parse(fileData)
                resolve()
        })
        .catch((reason)=>{
            const err = 'Failed at getting trainers reason: ' + reason
            reject(err)
        })
    })

}
