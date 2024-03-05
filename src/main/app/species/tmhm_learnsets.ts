import { regexGrabStr } from "../parse_utils"
import { CallQueue } from "../../call_queue";
import { ExecArray, GEdit } from "../../gedit";

export const TMHMCQ = new CallQueue("TMHM")

export interface Result{
    fileIterator: number,
    tmhmLearnsets: Map<string, string[]>,
}

interface Context {
    current: string[],
    currKey: string,
    tmhmLearnsets: Map<string, string[]>,
    execFlag: string,
    stopRead: boolean,
}

function initContext(): Context{
    return {
        current: [],
        currKey: "",
        tmhmLearnsets: new Map(),
        execFlag: "awaitForData",
        stopRead: false,
    }
}

const executionMap: {[key: string]: (line: string, context: Context) => void} = {
    "awaitForData": (line, context) => {
        if (line.match('gTMHMLearnsets')){
            context.execFlag = "main"
        }
    },
    "main": (line, context) =>{
        line = line.replace(/\s/g, '')
        if (line.match(/\[SPECIES_/)){
            if (context.currKey){
                context.tmhmLearnsets.set(context.currKey, context.current)
                context.current = []
            }
            context.currKey = regexGrabStr(line, /(?<=^\[)\w+/)
        } 
        if (line.match('MOVE_')){
            const tmhm = regexGrabStr(line, /(?<=TM\()\w+/)
            context.current.push(tmhm)
        } else if (line.match('};')){
            context.tmhmLearnsets.set(context.currKey, context.current)
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
        tmhmLearnsets: context.tmhmLearnsets
    }
}

export function addTMHM(specie: string, move: string){
    const execArray: ExecArray = [
        (line, ctx, _i, _lines)=>{
            if (line.match('\\[' + specie + '\\]')) ctx.next()
        },
        (line, ctx, i, lines)=>{
            if (line.match('TMHM_LEARNSET_END')){
                lines.splice(i, 0, `        TM(${move})`)
                ctx.stop()
            }
        }
    ]
    const gedit =  new GEdit("src/data/pokemon/tmhm_learnsets.h",TMHMCQ, "add TMHM", execArray, {cf: true})
    gedit.go()
}

export function removeTMHM(specie: string, move: string){
    const execArray: ExecArray = [
        (line, ctx, _i, _lines)=>{
            if (line.match('\\[' + specie + '\\]')) ctx.next()
        },
        (line, ctx, i, lines)=>{
            if (line.match('TM\(.*' + move + '\)')){
                lines.splice(i, 1)
                ctx.stop()
            }
            if (line.match(/\[SPECIES_/)) ctx.stop()
        }
    ]
    const gedit =  new GEdit("src/data/pokemon/tmhm_learnsets.h", TMHMCQ, "remove TMHM", execArray, {cf: true})
    gedit.go()
}