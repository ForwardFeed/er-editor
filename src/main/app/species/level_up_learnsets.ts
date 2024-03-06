import { regexGrabNum, regexGrabStr } from "../parse_utils"
import { CallQueue } from "../../call_queue";
import { ExecArray, GEdit } from "../../gedit";


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

export function replaceLearnset(ptr: string, moves: LevelUpMove[]){
    let begin = 0
    const execArray: ExecArray = [
        (line, ctx, i, lines)=>{
            if (line.match(`${ptr}\\[\\]`)) {
                begin = i
                ctx.next()
            }
            if (i == lines.length - 1) ctx.badReadMsg = `couldn't find pointer ${ptr}`
        },
        (line, ctx, i, lines)=>{
            if (line.match(';')) {
                const moveText = moves.map(x => `    LEVEL_UP_MOVE(${x.level}, ${x.move}),`).join('\n')
                const msg = `static const struct LevelUpMove ${ptr}[] = {\n${moveText}),\n    LEVEL_UP_END\n};`
                lines.splice(begin, i, msg)
                ctx.stop()
            }
        }
    ]
    const gedit =  new GEdit("src/data/pokemon/level_up_learnsets.h", LevelUPLearnsetCQ, "replace level up learnset", execArray, {cf: true})
    gedit.go()
}