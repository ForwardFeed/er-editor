import { TrainerPokemon } from "./teams";
import { CallQueue } from "../../call_queue";
import { Trainer } from "./trainers";
import { ExecArray, GEdit } from "../../gedit";

export const trainerEditCQ = new CallQueue("Evolutions")

function pokeToCData(poke: TrainerPokemon){
    return `    {
    .lvl = 0,
    .species = ${poke.specie},
    .heldItem = ${poke.item || "ITEM_NONE"},
    .ability = ${poke.ability},\
${poke.ivs[5]?"":"\n    .zeroSpeedIvs = TRUE,"}
    .evs = {${poke.evs.splice(0,6).join(', ')}},
    .nature = ${poke.nature},
    .moves = ${[0,1,2,3].map((_x,i) => poke.moves[i] || "MOVE_NONE").join(', ')}
    }`
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
    let begin = 0
    const execArray: ExecArray = [
        (line, ctx, i, lines)=>{
            if (line.match(ptr)){
                begin = i + 1
                ctx.next()
            }
            if (i == lines.length - 1) ctx.badReadMsg = `couldn't find pointer ${ptr}`
        },
        (line, ctx, i, lines)=>{
            if (line.match(";")){
                lines.splice(begin, i - begin, party.map(x => pokeToCData(x)).join(',\n'))
                ctx.stop()
            }
        }
    ]
    const gedit =  new GEdit("/src/data/trainer_parties.h",trainerEditCQ, "modify trainer party", execArray, {cf: true})
    gedit.go()
}

function removeTrainerParty(ptr: string){
    let begin = 0
    const execArray: ExecArray = [
        (line, ctx, i, lines)=>{
            if (line.match(`\\s${ptr}\\[`)){
                begin = i
                ctx.next()
            }
            if (i == lines.length - 1) ctx.badReadMsg = `couldn't find pointer ${ptr}`
        },
        (line, ctx, i, lines)=>{
            if (line.match(';')){
                lines.splice(begin, i - begin + 1)
                ctx.stop()
            }
        }
    ]
    const gedit =  new GEdit("/src/data/trainer_parties.h",trainerEditCQ, "remove trainer party", execArray, {cf: true})
    gedit.go()
}

function addTrainerParty(ptr: string, party: TrainerPokemon[]){
    const CData = `\nstatic const struct TrainerMonItemCustomMoves ${ptr}[] = {\n${party.map(x => pokeToCData(x)).join(',\n')}\n};`
    const execArray: ExecArray = [
        (_line, ctx, _i, lines)=>{
            lines.push(CData)
            ctx.next().stop()
        },
    ]
    const gedit =  new GEdit("/src/data/trainer_parties.h",trainerEditCQ, "add trainer party", execArray, {cf: true})
    gedit.go()
}

export function modTrainer(trainer: Trainer){
    let begin = 0
    let lastP = 0
    const execArray: ExecArray = [
        (line, ctx, i, lines)=>{
            if (line.match(`\\[${trainer.NAME}\\]`)){
                begin = i
                ctx.next()
            }
            if (i == lines.length - 1) ctx.badReadMsg = `couldn't find trainer ${trainer.NAME}`
        },
        (line, ctx, i, lines)=>{
            if (line.match(/\[TRAINER\w+]/) || line.match(';')){
                lines.splice(begin, lastP - begin, trainerToCData(trainer))
                ctx.stop()
            } 
            if (line.match(/\}/)) lastP = i + 1
        }
    ]
    const gedit =  new GEdit("/src/data/trainers.h", trainerEditCQ, "modify trainer", execArray, {cf: true})
    gedit.go()
}
export function rmInsane(tNAME: string, ptrInsane: string){
    let a = 0
    const execArray: ExecArray = [
        (line, ctx, i, lines) =>{
            if (line.match(`\\[${tNAME}\\]`)){
                ctx.next()
            }
            if (i == lines.length - 1) ctx.badReadMsg = `couldn't find trainer ${tNAME}`
        },
        (line, ctx, i, lines)=>{
            if (line.match(`Insane.*${ptrInsane}[^\\w]`)){
                if (!a){
                    a = i
                } else{
                    lines.splice(a, 1)
                    lines.splice(i - 1, 1)
                    ctx.next().stop()
                }
                
            }
            if (i == lines.length - 1) ctx.badReadMsg = `couldn't find ptr ${ptrInsane}`
        }
    ]
    const gedit =  new GEdit("/src/data/trainers.h", trainerEditCQ, "remove Insane", execArray, {cf: true})
    gedit.go()
}
export function addInsane(tNAME: string, ptrInsane: string, insaneParty: TrainerPokemon[]){
    let lastP = 0
    const execArray: ExecArray = [
        (line, ctx, i, lines) =>{
            if (line.match(`\\[${tNAME}\\]`)){
                ctx.next()
            }
            if (i == lines.length - 1) ctx.badReadMsg = `couldn't find trainer ${tNAME}`
        },
        (line, ctx, i, lines)=>{
            if (line.match(/\}/)) lastP = i
            if (line.match(/\[TRAINER_\w+\]/) || line.match(';')){
                lines.splice(lastP, 0, `        .partySizeInsane = ARRAY_COUNT(${ptrInsane}),
        .partyInsane = {.ItemCustomMoves = ${ptrInsane}},`)
                trainerEditCQ.addLock()
                addTrainerParty(ptrInsane, insaneParty)
                ctx.stop()
            }
        }
    ]
    const gedit =  new GEdit("/src/data/trainers.h", trainerEditCQ, "remove Insane", execArray, {cf: true})
    gedit.go()
}
export function removeTrainer(tNAME: string, ptrs: string[], tRematch: string){
    ptrs.forEach((ptr)=>{
        trainerEditCQ.feed(()=>{
            removeTrainerParty(ptr)
        }).poll()
    })
    let begin = 0
    const execArray: ExecArray = [
        (line, ctx, i, lines) =>{
            if (line.match(`\\[${tNAME}\\]`)){
                begin = i
                ctx.next()
            }
            if (i == lines.length - 1) ctx.badReadMsg = `couldn't find trainer ${tNAME}`
        },
        (line, ctx, i, lines)=>{
            if (line.match(/\[TRAINER_\w+\]/) || line.match(';')){
                lines.splice(begin, i - begin)
                ctx.stop()
            }
        }
    ]
    const gedit =  new GEdit("/src/data/trainers.h", trainerEditCQ, "remove Trainer", execArray, {cf: true})
    gedit.go()
    trainerEditCQ.addLock()
    const execArray2: ExecArray = [
        (line, ctx, i, lines) =>{
            if (line.match(`\\s${tNAME}\\s`)){
                lines.splice(i, 1)
                ctx.next().stop()
            }
            if (i == lines.length - 1) ctx.badReadMsg = `couldn't find Macro ${tNAME}`
        },
    ]
    const gedit2 =  new GEdit("/include/constants/opponents.h", trainerEditCQ, "remove trainer internal id", execArray2, {cf: true})
    gedit2.go()
    trainerEditCQ.addLock()
    const execArray3: ExecArray = [
        (line, ctx, i, lines) =>{
            if (line.match('const struct RematchTrainer gRematchTable')){
                ctx.next()
            }
            if (i == lines.length - 1) ctx.badReadMsg = `const struct RematchTrainer gRematchTable`
        },
        (line, ctx, i, lines) =>{
            if (line.match(`REMATCH\\(${tNAME},`)){
                lines.splice(i, 1)
                ctx.stop()
            } else if (line.match(`\\s${tNAME},`)){
                lines[i] = line.replace(` ${tNAME},`, '')
                ctx.stop()
            }
            if (line.match(';')) ctx.stop()
        },
    ]
    const gedit3 =  new GEdit("/src/battle_setup.c", trainerEditCQ, "remove rematches", execArray3, {cf: true})
    gedit3.go()
    if (!tRematch) return
    trainerEditCQ.addLock()
    const execArray4: ExecArray = [
        (line, ctx, i, lines) =>{
            if (line.match('enum')){
                ctx.next()
            }
            if (i == lines.length - 1) ctx.badReadMsg = `enum`
        },
        (line, ctx, i, lines) =>{
            if (line.match('REMATCH_TABLE_ENTRIES')) {
                ctx.stop()
            } else if (line.match(`${tRematch},`)) {
                lines.splice(i, 1)
                ctx.stop()
            }
            
        },
    ]
    const gedit4 =  new GEdit("/include/gym_leader_rematch.h", trainerEditCQ, "remove rematch macro entry", execArray4, {cf: true})
    gedit4.go()
}
export function addTrainer(trainer: Trainer, tRematch: string, tMap: string, tBase: string){
    const execArray: ExecArray = [
        (line, ctx, i, lines) =>{
            if (line.match(`\\[${trainer.NAME}\\]`)){
                ctx.badReadMsg = `A trainer with the name ${trainer.NAME} already Exist`
                ctx.stop()
            }
            if (line.match(';')){
                lines.splice(i, 0, "\n" + trainerToCData(trainer))
                trainerEditCQ.addLock()
                addTrainerParty(trainer.ptr, trainer.party)
                ctx.next().stop()
            }
        },
    ]
    const gedit =  new GEdit("/src/data/trainers.h", trainerEditCQ, "add Trainer", execArray, {cf: true})
    gedit.go()
    trainerEditCQ.addLock()
    let lastD = 0
    const execArray2: ExecArray = [
        (line, ctx, i, lines) =>{
            if (line.match(`\\s${trainer.NAME}\\s`)){
                ctx.badReadMsg = "a trainer already exist"
                ctx.stop()
            }
            if (line.match('#define TRAINERS_COUNT')){
                let text = `#define ${trainer.NAME} `
                lines.splice(i, 0, `${text}${" ".repeat(55 - text.length)}${lastD + 1}`)
                ctx.next().stop()
            }
            if (line.match('#define')){
                lastD = +line.split(/\s+/)[2]
            }
            if (i == lines.length - 1) ctx.badReadMsg = `couldn't find Macro #define TRAINERS_COUNT`
        },
    ]
    const gedit2 =  new GEdit("/include/constants/opponents.h", trainerEditCQ, "add trainer internal id", execArray2, {cf: true})
    gedit2.go()
    if (!tRematch) return
    trainerEditCQ.addLock()
    const execArray3: ExecArray = [
        (line, ctx, i, lines) =>{
            if (line.match('const struct RematchTrainer gRematchTable')){
                ctx.next()
            }
            if (i == lines.length - 1) ctx.badReadMsg = `const struct RematchTrainer gRematchTable`
        },
        (line, ctx, i, lines) =>{
            if (line.match(`\\[${tRematch}\\]`)){
                lines.splice(i, 1, line.replace(tMap, `${trainer.NAME}, ${tMap}`))
                ctx.stop()
            }
            if (line.match(';')) {
                lines.splice(i, 0, `    [${tRematch}] = REMATCH(${tBase}, ${trainer.NAME}, ${tMap})`)
                ctx.stop()
            }
        },
    ]
    const gedit3 =  new GEdit("/src/battle_setup.c", trainerEditCQ, "add rematches", execArray3, {cf: true})
    gedit3.go()
    if (!tBase) return
    trainerEditCQ.addLock()
    const execArray4: ExecArray = [
        (line, ctx, i, lines) =>{
            if (line.match('enum')){
                ctx.next()
            }
            if (i == lines.length - 1) ctx.badReadMsg = `enum`
        },
        (line, ctx, i, lines) =>{
            if (line.match('REMATCH_TABLE_ENTRIES')) {
                lines.splice(i, 0, `    ${tRematch},`)
                ctx.stop()
            } else if (line.match(`${tRematch},`)) {
                ctx.stop()
            }
            
        },
    ]
    const gedit4 =  new GEdit("/include/gym_leader_rematch.h", trainerEditCQ, "add rematch macro entry", execArray4, {cf: true})
    gedit4.go()
}

export function renameTrainer(previous: string, next: string){
    const execArray: ExecArray = [
        (line, ctx, i, lines) =>{
            if (line.match(`\\[${previous}\\]`)){
                lines.splice(i, 1, line.replace(previous, next))
                ctx.next().stop()
            }
            if (i == lines.length - 1) ctx.badReadMsg = `couldn't find trainer ${previous}`
        },
    ]
    const gedit =  new GEdit("/src/data/trainers.h", trainerEditCQ, "Rename Trainer", execArray, {cf: true})
    gedit.go()
    trainerEditCQ.addLock()
    const execArray2: ExecArray = [
        (line, ctx, i, lines) =>{
            if (line.match(`\\s${previous}\\s`)){
                lines.splice(i, 1, line.replace(previous, next))
                ctx.next().stop()
            }
            if (i == lines.length - 1) ctx.badReadMsg = `couldn't find macro ${previous}`
        },
    ]
    const gedit2 =  new GEdit("/include/constants/opponents.h", trainerEditCQ, "Rename trainer internal id", execArray2, {cf: true})
    gedit2.go()
    trainerEditCQ.addLock()
    const execArray3: ExecArray = [
        (line, ctx, i, lines) =>{
            if (line.match('const struct RematchTrainer gRematchTable')){
                ctx.next()
            }
            if (i == lines.length - 1) ctx.badReadMsg = `const struct RematchTrainer gRematchTable`
        },
        (line, ctx, i, lines) =>{
            if (line.match(previous)){
                lines.splice(i, 1, line.replace(`${previous},`, `${next},`))
            }
            if (line.match(';')) {
                ctx.stop()
            }
        },
    ]
    const gedit3 =  new GEdit("/src/battle_setup.c", trainerEditCQ, "rename rematches", execArray3, {cf: true})
    gedit3.go()
}