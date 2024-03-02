import path from "path";
import { getRawFile, writeRawFile } from "../utils_edit";
import { TrainerPokemon } from "./teams";
import { CallQueue } from "../../call_queue";
import { Trainer } from "./trainers";
import { configuration } from '../configuration'

export const trainerEditCQ = new CallQueue()

function pokeToCData(poke: TrainerPokemon, comma: boolean = false){
    return `    {
    .lvl = 0,
    .species = ${poke.specie},
    .heldItem = ${poke.item || "ITEM_NONE"},
    .ability = ${poke.ability},\
${poke.ivs[5]?"":"\n    .zeroSpeedIvs = TRUE,"}
    .evs = {${poke.evs.join(', ')}},
    .nature = ${poke.nature},
    .moves = ${poke.moves.join(', ')}
    }${comma?",\n":""}`
}

function trainerToCData(trainer: Trainer): string{
    return`    [${trainer.NAME}] =
    {
        .partyFlags = F_TRAINER_PARTY_HELD_ITEM | F_TRAINER_PARTY_CUSTOM_MOVESET,
        .trainerClass = ${trainer.tclass},
        .encounterMusic_gender = ${trainer.music},
        .trainerPic = ${trainer.pic},
        .trainerName = _("${trainer.name}"),
        .items = {},
        .doubleBattle = ${trainer.double?"TRUE":"FALSE"},
        .aiFlags = AI_FLAG_CHECK_BAD_MOVE | AI_FLAG_TRY_TO_FAINT | AI_FLAG_CHECK_VIABILITY | AI_FLAG_CHECK_FOE | AI_FLAG_SMART_SWITCHING | AI_FLAG_HP_AWARE,
        .partySize = ARRAY_COUNT(${trainer.ptr}),
        .party = {.ItemCustomMoves = ${trainer.ptr}},\
${trainer.ptrInsane?`\n        .partySizeInsane = ARRAY_COUNT(${trainer.ptrInsane}),`:""}\
${trainer.ptrInsane?`\n        .partyInsane = {.ItemCustomMoves = ${trainer.ptrInsane}},`:""}
    },`
}


export function modTrainerParty(ptr: string, party: TrainerPokemon[]){
    const filepath = path.join(configuration.project_root, "/src/data/trainer_parties.h")
    getRawFile(filepath)
        .then((rawData)=>{
            let newPokeData = ""
            const partyLen = party.length
            for (let i = 0; i < partyLen; i++){
                const poke = party[i]
                newPokeData += pokeToCData(poke, i != (partyLen - 1))
            }
            let status = 0
            let lineMatch = 0
            const lines = rawData.split('\n')
            const lineLen = lines.length
            for (let i = 0; i < lineLen; i++){
                const line = lines[i]
                if (!line) continue
                if (status == 0 && line.match(ptr)){
                    lineMatch = i + 1
                    status = 1
                }
                if (status == 1 && line.match(";")){
                    lines.splice(lineMatch, i - lineMatch, newPokeData)
                    break
                }
            }
            writeRawFile(filepath, lines.join('\n'))
                .then(()=>{
                    console.log('success modifying trainer')
                })
                .catch((err)=>{
                    console.error(`couldn't modify trainer, reason: ${err}`)
                })
        })
        .catch((err)=>{
            console.log(err)
        })
        .finally(()=>{
            trainerEditCQ.unlock().poll()
        })
}

function removeTrainerParty(ptr: string){
    const filepath = path.join(configuration.project_root, "/src/data/trainer_parties.h")
    getRawFile(filepath)
        .then((rawData)=>{
            let start = 0
            let stop = 0
            let status = 0
            const lines = rawData.split('\n')
            const lineLen = lines.length
            for (let i = 0; i < lineLen; i++){
                const line = lines[i]
                if (!line) continue
                if (status == 0 && line.match(`\\s${ptr}\\[`)){
                    start = i
                    status = 1
                }
                if (status == 0) continue
                if (line.match(';')){
                    stop = i
                    break
                }
            }
            if (start == 0){
                return console.error(`couldn't find pointer ${ptr}`)
            }
            console.log(start, stop)
            lines.splice(start, stop - start + 1)
            writeRawFile("./test.test", lines.join('\n'))
                .then(()=>{
                    console.log('success removed trainer party')
                })
                .catch((err)=>{
                    console.error(`couldn't write to remove trainer party, reason: ${err}`)
                })
        })
        .catch((err)=>{
            console.log(`Error while opening in remove Trainer party ${err}`)
        })
        .finally(()=>{
            trainerEditCQ.unlock().poll()
        })
    
}

function addTrainerParty(ptr: string, party: TrainerPokemon[]){
    const filepath = path.join(configuration.project_root, "/src/data/trainer_parties.h")
    let newPokeData = ""
    const partyLen = party.length
    for (let i = 0; i < partyLen; i++){
        const poke = party[i]
        newPokeData += pokeToCData(poke, i != (partyLen - 1))
    }
    const CData = `\nstatic const struct TrainerMonItemCustomMoves ${ptr}[] = {\n${newPokeData}\n};`
    getRawFile(filepath)
        .then((rawData)=>{
            rawData += CData
            writeRawFile(filepath, rawData)
                .then(()=>{
                    console.log('success add party')
                })
                .catch((err)=>{
                    console.error(`couldn't add party, reason: ${err}`)
                })
        })
        .catch((err)=>{
            console.log(err)
        })
        .finally(()=>{
            trainerEditCQ.unlock().poll()
        })
}

export function modTrainer(trainer: Trainer){
    const filepath = path.join(configuration.project_root, "/src/data/trainers.h")
    getRawFile(filepath)
        .then((rawData)=>{
            let status = 0
            let start = 0
            let lastP = 0
            const lines = rawData.split('\n')
            const lineLen = lines.length
            for (let i = 0; i < lineLen; i++){
                const line = lines[i]
                if (!line) continue
                if (status == 0 && line.match(`\\[${trainer.NAME}\\]`)){
                    console.log(line)
                    start = i
                    status = 1
                    continue
                }
                if (status == 0) continue
                if (line.match(/\}/)) lastP = i
                if (line.match(/\[TRAINER\w+]/)) break
            }
            if (start == 0){
                return console.error(`couldn't find trainer ${trainer.NAME}`)
            }
            lines.splice(start, lastP - start + 1, trainerToCData(trainer))
            writeRawFile(filepath, lines.join('\n'))
                .then(()=>{
                    console.log('success modifying trainer')
                    trainerEditCQ.unlock().poll()
                })
                .catch((err)=>{
                    console.error(`couldn't modify trainer, reason: ${err}`)
                })
        })
        .catch((err)=>{
            console.log(err)
        })
        .finally(()=>{
            console.log('mod trainer finished')
        })
}
export function rmInsane(ptrInsane: string){
    const filepath = path.join(configuration.project_root, "/src/data/trainers.h")
    getRawFile(filepath)
        .then((rawData)=>{
            let status = 0
            let a = 0
            let b = 0
            const lines = rawData.split('\n')
            const lineLen = lines.length
            for (let i = 0; i < lineLen; i++){
                const line = lines[i]
                if (!line) continue
                if (status <= 1 && line.match(`Insane.*${ptrInsane}[^\\w]`)){
                    status += 1
                    if (a){
                        b = i
                    } else{
                        a = i
                    }
                }
                if (status > 1) break
            }
            if (!a && !b) {
                return console.error(`couldn't find any insane associated pointer ${ptrInsane}`)
            }
            lines.splice(a, 1)
            lines.splice(b - 1, 1)
            writeRawFile("./test.test", lines.join('\n'))
                .then(()=>{
                    console.log('success modifying trainer')
                    removeTrainerParty(ptrInsane)
                })
                .catch((err)=>{
                    console.error(`couldn't modify trainer, reason: ${err}`)
                })
        })
        .catch((err)=>{
            console.log(err)
        })
}
export function addInsane(tNAME: string, ptrInsane: string, insaneParty: TrainerPokemon[]){
    const filepath = path.join(configuration.project_root, "/src/data/trainers.h")
    getRawFile(filepath)
        .then((rawData)=>{
            let insert = 0
            let status = 0
            const lines = rawData.split('\n')
            const lineLen = lines.length
            for (let i = 0; i < lineLen; i++){
                const line = lines[i]
                if (!line) continue
                if (status == 0 && line.match(`\\[${tNAME}\\]`)){
                    status = 1
                }
                if (status == 0) continue
                if (line.match(/\.party/)) status += 1
                if (status == 3) {
                    insert = i
                    break
                }   
            }
            if (!insert){
                return console.error(`couldn't find any trainer ${tNAME}`)
            }
            lines.splice(insert + 2, 0, `        .partySizeInsane = ARRAY_COUNT(${ptrInsane}),
        .partyInsane = {.ItemCustomMoves = ${ptrInsane}},`)
            writeRawFile(filepath, lines.join('\n'))
                .then(()=>{
                    console.log('success modifying trainer')
                    addTrainerParty(ptrInsane, insaneParty)
                })
                .catch((err)=>{
                    console.error(`couldn't modify trainer, reason: ${err}`)
                })
        })
        .catch((err)=>{
            console.log(err)
        })
}
export function rmRem(tNAME: string){
    
    trainerEditCQ.unlock().poll()
}
export function addRem(tNAME: string, tName: string, ptr: string, party: TrainerPokemon[]){

    trainerEditCQ.unlock().poll()
}
export function removeTrainer(tNAME: string){


    trainerEditCQ.unlock().poll()
}
export function addTrainer(trainer: Trainer){


    trainerEditCQ.unlock().poll()
}
