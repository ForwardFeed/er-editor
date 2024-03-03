import path from "path";
import { getRawFile, writeRawFile } from "../utils_edit";
import { TrainerPokemon } from "./teams";
import { CallQueue } from "../../call_queue";
import { Trainer } from "./trainers";
import { configuration } from '../configuration'

export const trainerEditCQ = new CallQueue("Evolutions")

function pokeToCData(poke: TrainerPokemon, comma: boolean = false){
    return `    {
    .lvl = 0,
    .species = ${poke.specie},
    .heldItem = ${poke.item || "ITEM_NONE"},
    .ability = ${poke.ability},\
${poke.ivs[5]?"":"\n    .zeroSpeedIvs = TRUE,"}
    .evs = {${poke.evs.join(', ')}},
    .nature = ${poke.nature},
    .moves = ${[0,1,2,3].map((_x,i) => poke.moves[i] || "MOVE_NONE").join(', ')}
    }${comma?",\n":""}`
}

function trainerToCData(trainer: Trainer): string{
    return`    [${trainer.NAME}] =
    {
        .partyFlags = F_TRAINER_PARTY_HELD_ITEM | F_TRAINER_PARTY_CUSTOM_MOVESET,
        .trainerClass = ${trainer.tclass},
        .encounterMusic_gender = ${trainer.gender ? "F_TRAINER_FEMALE | ": ""}${trainer.music},
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
                const line = lines[i].replace(/\/\/.*/, '')
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
                .finally(()=>{
                    trainerEditCQ.unlock().poll()
                })
        })
        .catch((err)=>{
            console.log(err)
        })
}

function removeTrainerParty(ptr: string, callback: ()=>void){
    const filepath = path.join(configuration.project_root, "/src/data/trainer_parties.h")
    getRawFile(filepath)
        .then((rawData)=>{
            let start = 0
            let stop = 0
            let status = 0
            const lines = rawData.split('\n')
            const lineLen = lines.length
            for (let i = 0; i < lineLen; i++){
                const line = lines[i].replace(/\/\/.*/, '')
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
                console.error(`couldn't find party pointer ${ptr}`)
                return callback()
            }
            lines.splice(start, stop - start + 1)
            writeRawFile(filepath, lines.join('\n'))
                .then(()=>{
                    console.log('success removed trainer party ' + ptr)
                })
                .catch((err)=>{
                    console.error(`couldn't write to remove trainer party, reason: ${err}`)
                })
                .finally(()=>{
                    callback()
                })
        })
        .catch((err)=>{
            console.log(`Error while opening in remove Trainer party ${err}`)
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
    const CData = `\n\nstatic const struct TrainerMonItemCustomMoves ${ptr}[] = {\n${newPokeData}\n};`
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
                .finally(()=>{
                    trainerEditCQ.unlock().poll()
                })
        })
        .catch((err)=>{
            console.log(err)
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
                const line = lines[i].replace(/\/\/.*/, '')
                if (!line) continue
                if (status == 0 && line.match(`\\[${trainer.NAME}\\]`)){
                    start = i
                    status = 1
                    continue
                }
                if (status == 0) continue
                if (line.match(/\}/)) lastP = i
                if (line.match(/\[TRAINER\w+]/)) break
            }
            if (start == 0){
                console.error(`couldn't find trainer ${trainer.NAME}`)
                trainerEditCQ.unlock().poll()
                return 
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
                .finally(()=>{
                    trainerEditCQ.unlock().poll()
                })
        })
        .catch((err)=>{
            console.log(err)
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
                const line = lines[i].replace(/\/\/.*/, '')
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
                console.error(`couldn't find any insane associated pointer ${ptrInsane}`)
                trainerEditCQ.unlock().poll()
                return
            }
            lines.splice(a, 1)
            lines.splice(b - 1, 1)
            writeRawFile(filepath, lines.join('\n'))
                .then(()=>{
                    console.log('success modifying trainer')
                    removeTrainerParty(ptrInsane, ()=>{})
                })
                .catch((err)=>{
                    console.error(`couldn't modify trainer, reason: ${err}`)
                })
                .finally(()=>{
                    trainerEditCQ.unlock().poll()
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
                const line = lines[i].replace(/\/\/.*/, '')
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
                console.error(`couldn't find any trainer ${tNAME}`)
                trainerEditCQ.unlock().poll()
                return 
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
                .finally(()=>{
                    trainerEditCQ.unlock().poll()
                })
        })
        .catch((err)=>{
            console.log(err)
        })
}
export function removeTrainer(tNAME: string, ptrs: string[]){
    trainerEditCQ.locks(3)
    function removePartyPtr(){
        if (ptrs.length == 0){
            trainerEditCQ.unlock().poll()
            return
        }
        const ptr = ptrs.splice(0,1)[0]
        removeTrainerParty(ptr, ()=>{
            removePartyPtr()
        })
    }
    removePartyPtr()
    const filepath = path.join(configuration.project_root, "/src/data/trainers.h")
    getRawFile(filepath)
        .then((rawData)=>{
            let start = 0
            let stop = 0
            let status = 0
            const lines = rawData.split('\n')
            const lineLen = lines.length
            for (let i = 0; i < lineLen; i++){
                const line = lines[i].replace(/\/\/.*/, '')
                if (!line) continue
                if (status == 0 && line.match(`\\[${tNAME}\\]`)){
                    start = i
                    status = 1
                    continue
                }
                if (status == 0) continue
                if (line.match(/\[TRAINER_\w+\]/ ) || line.match(';')){
                    stop = i
                    break
                }
            }
            if (!start || !stop){
                console.error(`couldn't remove trainer: couldn't find ${tNAME}`)
                trainerEditCQ.unlock().poll()
                return
            }
            lines.splice(start, stop - start)
            writeRawFile(filepath, lines.join('\n'))
                .then(()=>{
                    console.log(`success remove trainer ${tNAME}`)
                })
                .catch((err)=>{
                    console.error(`couldn't remove trainer, reason: ${err}`)
                })
                .finally(()=>{
                    trainerEditCQ.unlock().poll()
                })
        })
        .catch((err)=>{
            console.log(err)
        })
        
    const filepath2 = path.join(configuration.project_root, "/include/constants/opponents.h")
    getRawFile(filepath2)
        .then((rawData)=>{
            let status = 0
            const lines = rawData.split('\n')
            const lineLen = lines.length
            for (let i = 0; i < lineLen; i++){
                const line = lines[i].replace(/\/\/.*/, '')
                if (!line) continue
                if (status == 0 && line.match(`\\s${tNAME}\\s`)){
                    status = 1
                    lines.splice(i, 1)
                    break
                }
            }
            if (!status){
                console.error(`couldn't remove trainer in opponents.h: couldn't find ${tNAME}`)
                trainerEditCQ.unlock().poll()
                return
            }
            writeRawFile(filepath2, lines.join('\n'))
                .then(()=>{
                    console.log('success remove trainer internal id')
                })
                .catch((err)=>{
                    console.error(`couldn't remove trainer, reason: ${err}`)
                })
                .finally(()=>{
                    trainerEditCQ.unlock().poll()
                })
        })
        .catch((err)=>{
            console.log(err)
        })
}
export function addTrainer(trainer: Trainer){
    trainerEditCQ.locks(3)
    addTrainerParty(trainer.ptr, trainer.party)
    const filepath = path.join(configuration.project_root, "/src/data/trainers.h")
    getRawFile(filepath)
        .then((rawData)=>{
            const lines = rawData.split('\n')
            const lineLen = lines.length
            for (let i = 0; i < lineLen; i++){
                const line = lines[i].replace(/\/\/.*/, '')
                if (!line) continue
                if (line.match(';')){
                    lines.splice(i, 0, "\n" + trainerToCData(trainer))
                    break
                }
            }
            writeRawFile(filepath, lines.join('\n'))
                .then(()=>{
                    console.log('success add trainer data')
                })
                .catch((err)=>{
                    console.error(`couldn't remove trainer, reason: ${err}`)
                })
                .finally(()=>{
                    trainerEditCQ.unlock().poll()
                })
        
        })
        .catch((err)=>{
            console.log(err)
        })

    const filepath2 = path.join(configuration.project_root, "/include/constants/opponents.h")
    getRawFile(filepath2)
        .then((rawData)=>{
            let status = 0
            let last = 0
            const lines = rawData.split('\n')
            const lineLen = lines.length
            for (let i = 0; i < lineLen; i++){
                const line = lines[i].replace(/\/\/.*/, '')
                if (!line) continue
                if (line.match('#define TRAINERS_COUNT')){
                    let text = `#define ${trainer.NAME} `
                    lines.splice(i, 0, `${text}${" ".repeat(55 - text.length)}${last + 1}`)
                    status = 1
                    break
                }
                if (line.match('#define')){
                    last = +line.split(/\s+/)[2]
                }
            }
            if (!status){
                console.error(`couldn't add trainer in opponents.h: couldn't find #define TRAINERS_COUNT}`)
                trainerEditCQ.unlock().poll()
                return
            }
            writeRawFile(filepath2, lines.join('\n'))
                .then(()=>{
                    console.log('success add trainer internal ID')
                })
                .catch((err)=>{
                    console.error(`couldn't remove trainer, reason: ${err}`)
                })
                .finally(()=>{
                    trainerEditCQ.unlock().poll()
                })
        
        })
        .catch((err)=>{
            console.log(err)
        })
}

export function renameTrainer(previous: string, next: string){
    trainerEditCQ.locks(2)
    const filepath = path.join(configuration.project_root, "/src/data/trainers.h")
    getRawFile(filepath)
        .then((rawData)=>{
            const lines = rawData.split('\n')
            const lineLen = lines.length
            for (let i = 0; i < lineLen; i++){
                const line = lines[i].replace(/\/\/.*/, '')
                if (!line) continue
                if (line.match(`\\[${previous}\\]`)){
                    lines.splice(i, 1, line.replace(previous, next))
                    break
                }
                if (i == lineLen - 1){
                    console.log(`failed to find ${previous} into trainers.h`)
                }
            }
            writeRawFile(filepath, lines.join('\n'))
                .then(()=>{
                    console.log('success rename trainer internal NAME')
                })
                .catch((err)=>{
                    console.error(`couldn't rename trainer internal NAME, reason: ${err}`)
                })
                .finally(()=>{
                    trainerEditCQ.unlock().poll()
                })        
        })
        .catch((err)=>{
            console.log(err)
        })
        
    const filepath2 = path.join(configuration.project_root, "/include/constants/opponents.h")
    getRawFile(filepath2)
        .then((rawData)=>{
            const lines = rawData.split('\n')
            const lineLen = lines.length
            for (let i = 0; i < lineLen; i++){
                const line = lines[i].replace(/\/\/.*/, '')
                if (!line) continue
                if (line.match(`\\s${previous}\\s`)){
                    lines.splice(i, 1, line.replace(previous, next))
                    break
                }
                if (i == lineLen -1){
                    console.log(`failed to find ${previous} into opponents.h`)
                }
            }
            writeRawFile(filepath2, lines.join('\n'))
                .then(()=>{
                    console.log('success add trainer internal ID')
                })
                .catch((err)=>{
                    console.error(`couldn't rename trainer internal NAME, reason: ${err}`)
                })
                .finally(()=>{
                    trainerEditCQ.unlock().poll()
                })
        })
        .catch((err)=>{
            console.log(err)
        })
        
}
