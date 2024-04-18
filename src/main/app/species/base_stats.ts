import { ExecArray, GEdit } from "../../gedit"
import { regexGrabNum, regexGrabStr, Xtox } from "../parse_utils"
import { CallQueue } from "../../call_queue"

export const BSCQ = new CallQueue('Base Stats', true)

export interface BaseStats {
    baseHP: number,
    baseAttack: number,
    baseDefense: number,
    baseSpeed: number,
    baseSpAttack: number,
    baseSpDefense: number,
    types: string[],
    catchRate: number,
    expYield: number,
    evYield_HP: number,
    evYield_Attack: number,
    evYield_Defense: number,
    evYield_Speed: number,
    evYield_SpAttack: number,
    evYield_SpDefense: number,
    items: string[],
    genderRatio: number,
    eggCycles: number,
    friendship: number,
    growthRate: string, 
    eggGroup: string[],
    abilities: string[],
    innates: string[],
    bodyColor: string,
    noFlip: boolean,
    flags: string,
}

function initBaseStats(): BaseStats{
    return {
        baseHP: -1,
        baseAttack: -1,
        baseDefense: -1,
        baseSpeed: -1,
        baseSpAttack: -1,
        baseSpDefense: -1,
        types: [],
        catchRate: -1,
        expYield: -1,
        evYield_HP: 0,
        evYield_Attack: 0,
        evYield_Defense: 0,
        evYield_Speed: 0,
        evYield_SpAttack: 0,
        evYield_SpDefense: 0,
        items: [],
        genderRatio: -1,
        eggCycles: -1,
        friendship: -1,
        growthRate: "", 
        eggGroup: [],
        abilities: [],
        innates: [],
        bodyColor: "",
        noFlip: false,
        flags: "",
    }
}

export interface Result{
    fileIterator: number,
    baseStats: Map<string, BaseStats>,
}

interface Context{
    current: BaseStats,
    currKey: string,
    baseStats: Map<string, BaseStats>,
    execFlag: string,
    stopRead: boolean,
}

function initContext(): Context{
    return {
        current: initBaseStats(),
        currKey: "",
        baseStats: new Map(),
        execFlag: "awaitForStart",
        stopRead: false
    }
}

const executionMap: {[key: string]: (line: string, context: Context) => void} = {
    "awaitForStart": (line, context) => {
        if (line.match('gBaseStats')){
            context.execFlag = "main"
        }
    },
    "main": (line, context) =>{
        line = line.replace(/\s/g, '')
        if (!line) return
        if (line.match(/^\[SPECIES/)){
            if (context.currKey){
                if (context.current.baseSpeed != 0){
                    // having a base speed of 0 means it don't have to be set in
                    context.baseStats.set(context.currKey, context.current)
                }
                context.current = initBaseStats()
            }
            context.currKey = regexGrabStr(line, /(?<=^\[)\w+/)
            return
        } else if (line.match(/\.((base)|(evYield)|(eggCycles)|(friendship)|(catchRate)|(expYield))/)){
            const stats = regexGrabStr(line, /(?<=\.)\w+/) as keyof BaseStats
            const value = regexGrabNum(line, /(?<==)\d+/, 0)
            Object.assign(context.current, {[stats]: value})
        } else if (line.match(/\.((growthRate)|(bodyColor)|(flags))/)) {
            const stats = regexGrabStr(line, /(?<=\.)\w+/) as keyof BaseStats
            const value = regexGrabStr(line, /(?<==)\w+/)
            Object.assign(context.current, {[stats]: value})
        } else if (line.match('genderRatio')){
            const value = regexGrabStr(line, /(?<==)\w+/)
            if (value === "MON_FEMALE"){
                context.current.genderRatio = 254
            } else if (value === "PERCENT_FEMALE"){
                context.current.genderRatio = regexGrabNum(line, /(?<=\()\d+/, 0)
            } else if (value === "MON_MALE"){
                context.current.genderRatio = 0
            } else if (value === "MON_GENDERLESS"){
                context.current.genderRatio = 255
            }
        } else if (line.match('.type')){
            context.current.types.push(Xtox('TYPE_',regexGrabStr(line, /(?<==)\w+/)))
        } else if (line.match('.egg')){
            context.current.eggGroup.push(regexGrabStr(line, /(?<==)\w+/))
        } else if (line.match('.item')){
            context.current.items.push(regexGrabStr(line, /(?<==)\w+/))
        } else if (line.match(/\.abilities/)){
            context.current.abilities = regexGrabStr(line, /(?<=={)[\w,]+/).split(',')
        } else if (line.match(/\.innates/)){
            context.current.innates = regexGrabStr(line, /(?<=={)[\w,]+/).split(',')
        } else if (line.match('.noFlip')){
            context.current.noFlip = regexGrabStr(line, /(?<==)\w+/) === "TRUE"
        } else if (line.match('};')){
            if (context.current.baseSpeed != 0){
                context.baseStats.set(context.currKey, context.current)
            }
            context.stopRead = true
        }
    }
}

export function parse(lines: string[], fileIterator: number): Result{
    const lineLen = lines.length
    const context = initContext()
    for (;fileIterator<lineLen; fileIterator++){
        let line = lines[fileIterator]
        executionMap[context.execFlag](line, context)
        if (context.stopRead) break
    }
    return {
        fileIterator: fileIterator,
        baseStats: context.baseStats
    }
}

export function changeBaseStats(specie: string, values: number[]){
    const baseStatsFieldTable: string[] = [
        'baseHP',
        'baseAttack',
        'baseDefense',
        'baseSpAttack',
        'baseSpDefense',
        'baseSpeed',
    ]
    const foundFields: number[] = []
    const execArray: ExecArray = [
        (line, ctx, i, lines)=>{
            if (line.match(`\\[${specie}\\]`)) ctx.next()
            if (lines.length -1 == i) ctx.badReadMsg = `couldn't find specie :${specie}`
        },
        (line, ctx, i, lines)=>{
            if (line.match(/\[SPECIES/)){
                if (foundFields.length != baseStatsFieldTable.length){
                    ctx.badReadMsg = `couldn't find field(s): ${baseStatsFieldTable.filter((_x, xi)=>
                        foundFields.indexOf(xi) == -1).join(' ,')}`
                }
                ctx.stop()
            }
            if (!baseStatsFieldTable.length) ctx.stop()
            const fieldLen = baseStatsFieldTable.length
            for (let j = 0; j < fieldLen; j++){
                const field = baseStatsFieldTable[j]
                if (line.match(field)){
                    foundFields.push(j)
                    const baseText = `    .${field}`
                    lines.splice(i, 1, `${baseText}${" ".repeat(20 - baseText.length)}= ${values[j]},`)
                }
            }
        }
    ]
    
    const gedit =  new GEdit("src/data/pokemon/base_stats.h", BSCQ, "change base stats", execArray, {cf: true})
    gedit.go()
}

export function changeAbis(specie: string, field: string, abis: string[]){
    const execArray: ExecArray = [
        (line, ctx, i, lines)=>{
            if (line.match(`\\[${specie}\\]`)) ctx.next()
            if (lines.length -1 == i) ctx.badReadMsg = `couldn't find specie :${specie}`
        },
        (line, ctx, i, lines)=>{
            if (line.match(field)){
                const baseText = `    .${field}`
                lines.splice(i, 1, `${baseText}${" ".repeat(20 - baseText.length)}= {${abis.join(', ')}},`)
                ctx.stop()
            } else if (line.match(/\[SPECIES/)){
                ctx.badReadMsg = `couldn't find field ${field}`
                ctx.stop()
            }
        }
    ]
    
    const gedit =  new GEdit("src/data/pokemon/base_stats.h", BSCQ, "change base stats", execArray, {cf: true})
    gedit.go()
}


export function changeTypes(specie: string, types: [string, string]){
    let found = false
    const execArray: ExecArray = [
        (line, ctx, i, lines)=>{
            if (line.match(`\\[${specie}\\]`)) ctx.next()
            if (lines.length -1 == i) ctx.badReadMsg = `couldn't find specie :${specie}`
        },
        (line, ctx, i, lines)=>{
            if (line.match('\.type')){
                const typeNb = regexGrabStr(line, /(?<=type)\d/)
                const baseText = `    .type${typeNb}`
                if (typeNb === "1"){
                    lines.splice(i, 1, `${baseText}${" ".repeat(20 - baseText.length)}= ${types[0]},`)
                } else {
                    lines.splice(i, 1, `${baseText}${" ".repeat(20 - baseText.length)}= ${types[1]},`)
                }
                found = true
            } else if (line.match(/\[SPECIES/)){
                if (!found) ctx.badReadMsg = `couldn't find field type}`
                ctx.stop()
            }
        }
    ]
    
    const gedit =  new GEdit("src/data/pokemon/base_stats.h", BSCQ, "change base stats", execArray, {cf: true})
    gedit.go()
}