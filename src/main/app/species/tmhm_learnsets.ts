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

function createTMHMText(specie: string, moves: string[]){
    return `    [${specie}] = TMHM_LEARNSET
${moves.map(x => `        TM(${x})`).join('\n')}
        TMHM_LEARNSET_END`
}

export function modTMHM(specie: string, moves: string[]){
    const tmhmText = createTMHMText(specie, moves)
    let start = 0
    const execArray: ExecArray = [
        (line, ctx, i, lines)=>{
            if (line.match('\\[' + specie + '\\]')) {
                start = i
                ctx.next()
            }
            else if (line.match(';')){
                if (!tmhmText){
                    ctx.next()
                    return
                }
                lines.splice(i, 0, tmhmText)
                ctx.next()
            }
        },
        (line, ctx, i, lines)=>{
            if (line.match('TMHM_LEARNSET_END')) {
                if (!tmhmText){
                    lines.splice(start, i - start + 1)
                    ctx.stop()
                    return
                }
                lines.splice(start, i - start + 1, tmhmText)
                ctx.stop()
            }
        }
    ]
    const gedit =  new GEdit("src/data/pokemon/tmhm_learnsets.h", TMHMCQ, "modify TMHM poke moves", execArray, {cf: true})
    gedit.go()
}