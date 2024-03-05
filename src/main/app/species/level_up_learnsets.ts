import path from "path"
import { regexGrabNum, regexGrabStr } from "../parse_utils"
import { getRawFile, writeRawFile } from "../utils_edit"
import { CallQueue } from "../../call_queue";
import { configuration } from "../configuration";

export const LevelUPLearnsetCQ = new CallQueue('Level Up Learnset')

export interface Result{
    fileIterator: number,
    levelLearnsets: Map<string, LevelUpMove[]>,
    lrnPtr: Map<string, string>,
}

export interface LevelUpMove {
    level: number,
    move: string,
}

interface Context {
    current: LevelUpMove[],
    currKey: string,
    levelUpLearnsetPtr: Map<string, LevelUpMove[]>,
    levelUpLearnset: Map<string, LevelUpMove[]>,
    execFlag: string,
    stopRead: boolean,
    lrnPtr: Map<string, string>,
}

function initContext(): Context{
    return {
        current: [],
        currKey: "",
        levelUpLearnsetPtr: new Map(),
        levelUpLearnset: new Map(),
        lrnPtr: new Map(),
        execFlag: "main",
        stopRead: false,
    }
}

const executionMap: {[key: string]: (line: string, context: Context) => void} = {
    "main": (line, context) =>{
        line = line.replace(/\s/g, '')
        if (!line) return
        if (line.match('LevelUpMove')){
            if (context.currKey){
                context.levelUpLearnsetPtr.set(context.currKey, context.current)
                context.current = []
            }
            context.currKey = regexGrabStr(line, /(?<=LevelUpMove)\w+/)
        } else if (line.match('LEVEL_UP_MOVE')){
            let levelUpMove = {
                level: regexGrabNum(line, /(?<=\()\d+/, 0),
                move: regexGrabStr(line, /\w+(?=\))/)
            }
            context.current.push(levelUpMove)
        }
        if (line.match('gLevelUpLearnsets')){
            context.levelUpLearnsetPtr.set(context.currKey, context.current)
            context.execFlag = "pointers"
        }
    },
    "pointers": (line, context) => {
        line = line.replace(/\s/g, '')
        if (line.match(/^\[SPECIES/)){
            const species = regexGrabStr(line, /(?<=\[)SPECIES\w+/)
            const ptr = regexGrabStr(line, /(?<==)\w+/)
            if (!context.levelUpLearnsetPtr.has(ptr)) return
            const learnset: LevelUpMove[] | undefined = context.levelUpLearnsetPtr.get(ptr)
            if (!learnset) return
            context.levelUpLearnset.set(species, learnset)
            context.lrnPtr.set(species, ptr)
        }
        if (line.match('};')){
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
        levelLearnsets: context.levelUpLearnset,
        lrnPtr: context.lrnPtr
    }
}

export function addLearnset(ptr: string, move: string, level: number){
    const filepath = path.join(configuration.project_root, "src/data/pokemon/level_up_learnsets.h")
    getRawFile(filepath)
        .then((rawData)=>{
            let status = 0
            const lines = rawData.split('\n')
            const lineLen = lines.length
            for (let i = 0; i < lineLen; i++){
                const line = lines[i].replace(/\/\/.*/, '')
                if (!line) continue
                if (status == 0 && line.match(`${ptr}\\[\\]`)){
                    status = 1
                }
                if (status == 0) continue
                if (line.match('LEVEL_UP_END')){
                    lines.splice(i, 0, `        LEVEL_UP_MOVE(${level}, ${move}),`)
                    break
                }
            }
            if (status == 0){
                console.error(`couldn't find Learnset ${move} for ${ptr}`)
                LevelUPLearnsetCQ.unlock().poll()
                return
            }
            writeRawFile(filepath, lines.join('\n'))
                .then(()=>{
                    console.log('success add Learnset')
                })
                .catch((err)=>{
                    console.error(`couldn't add Learnset, reason: ${err}`)
                })
                .finally(()=>{
                    LevelUPLearnsetCQ.unlock().poll()
                })        
        })
        .catch((err)=>{
            console.log(err)
        })
}

export function removeLearnset(ptr: string, move: string){
    const filepath = path.join(configuration.project_root, "src/data/pokemon/level_up_learnsets.h")
    getRawFile(filepath)
        .then((rawData)=>{
            let status = 0
            const lines = rawData.split('\n')
            const lineLen = lines.length
            for (let i = 0; i < lineLen; i++){
                const line = lines[i].replace(/\/\/.*/, '')
                if (!line) continue
                if (status == 0 && line.match(`${ptr}\\[\\]`)){
                    status = 1
                }
                if (status == 0) continue
                if (line.match('TUTOR\(.*' + move + '\)')){
                    lines.splice(i, 1)
                    break
                }
                if (line.match('LEVEL_UP_END')) break
            }
            if (status == 0){
                console.error(`couldn't find Learnset ${move} for ${ptr}`)
                LevelUPLearnsetCQ.unlock().poll()
                return
            }
            writeRawFile(filepath, lines.join('\n'))
                .then(()=>{
                    console.log('success remove Learnset')
                })
                .catch((err)=>{
                    console.error(`couldn't remove Learnset, reason: ${err}`)
                })
                .finally(()=>{
                    LevelUPLearnsetCQ.unlock().poll()
                })        
        })
        .catch((err)=>{
            console.log(err)
        })
}
