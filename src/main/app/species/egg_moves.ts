import { regexGrabStr } from "../parse_utils"
import { CallQueue } from "../../call_queue";
import { ExecArray, GEdit } from "../../gedit";

export const EggMoveCQ = new CallQueue('Egg Moves')

export interface Result{
    fileIterator: number,
    eggmoves: Map<string, string[]>,
}

interface Context {
    current: string[],
    currKey: string,
    eggmoves: Map<string, string[]>,
    execFlag: string,
    stopRead: boolean,
}

function initContext(): Context{
    return {
        current: [],
        currKey: "",
        eggmoves: new Map(),
        execFlag: "awaitForStart",
        stopRead: false,
    }
}

const executionMap: {[key: string]: (line: string, context: Context) => void} = {
    "awaitForStart": (line, context) => {
        if (line.match('gEggMoves')){
            context.execFlag = "main"
        }
    },
    "main": (line, context) =>{
        line = line.replace(/\s/g, '')
        if (!line) return
        if (line.match('egg_moves')){
            if (context.currKey){
                context.eggmoves.set(context.currKey, context.current)
                context.current = []
            }
            context.currKey = "SPECIES_" + regexGrabStr(line, /(?<=\()\w+/)
        } if (line.match(/MOVE/)){
            context.current.push(regexGrabStr(line, /MOVE\w+/))
        } else if (line.match('};')){
            context.eggmoves.set(context.currKey, context.current)
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
        eggmoves: context.eggmoves
    }
}

export function replaceEggMoves(specie: string, moves: string[]){
    specie = specie.replace('SPECIES_', '')
    let begin = 0
    const execArray: ExecArray = [
        (line, ctx, i, _lines)=>{
            if (line.match(`\\(${specie},`)) {
                ctx.next()
                ctx.loopOnce()
                begin = i
            }
        },
        (line, ctx, i, lines)=>{
            if (line.match(/\)/)) {
                const newText = `    egg_moves(${specie},\n${moves.map(x => `        ${x}`).join(',\n')}),`
                lines.splice(begin, i - begin + 1, newText)
                ctx.stop()
            }
        }
    ]
    const gedit = new GEdit("src/data/pokemon/egg_moves.h", EggMoveCQ, "add egg move", execArray, {cf: true})
    gedit.go()
}