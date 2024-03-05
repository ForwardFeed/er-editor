import { regexGrabStr } from "../parse_utils"
import { CallQueue } from "../../call_queue";
import { ExecArray, GEdit } from "../../gedit";

export const TutorCQ = new CallQueue("Tutor")

export interface Result{
    fileIterator: number,
    tutorMoves: Map<string, string[]>,
}

interface Context {
    tutorArray: string[],
    current: string[],
    currKey: string,
    tutorMoves: Map<string, string[]>,
    execFlag: string,
    stopRead: boolean,
}

function initContext(): Context{
    return {
        tutorArray: [],
        current: [],
        currKey: "",
        tutorMoves: new Map(),
        execFlag: "awaitForData",
        stopRead: false,
    }
}

const executionMap: {[key: string]: (line: string, context: Context) => void} = {
    "awaitForData": (line, context) => {
        if (line.match('gTutorLearnsets')){
            context.execFlag = "newTutor"
        }
    },
    "newTutor": (line, context) => {
        if (line.match('SPECIES_')){
            if (context.currKey){
                context.tutorMoves.set(context.currKey, context.current)
                context.current = []
            }
            context.currKey = regexGrabStr(line, /SPECIES_\w+/)
        } else if (line.match('MOVE_')){
            const moveName = regexGrabStr(line, /MOVE_\w+/)
            context.current.push(moveName)
        } else if (line.match(';')){
            if (context.currKey){
                context.tutorMoves.set(context.currKey, context.current)
            }
            context.stopRead = true
        }
    },
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
        tutorMoves: context.tutorMoves
    }
}


export function addTutor(specie: string, move: string){
    const execArray: ExecArray = [
        (line, ctx, _i, _lines)=>{
            if (line.match('\\[' + specie + '\\]')) ctx.next()
        },
        (line, ctx, i, lines)=>{
            if (line.match('TUTOR_LEARNSET_END')){
                lines.splice(i, 0, `        TUTOR(${move})`)
                ctx.stop()
            }
        }
    ]
    const gedit = new GEdit("src/data/pokemon/tutor_learnsets.h", TutorCQ, "add Tutor", execArray, {cf: true})
    gedit.go()
}

export function removeTutor(specie: string, move: string){
    const execArray: ExecArray = [
        (line, ctx, _i, _lines)=>{
            if (line.match('\\[' + specie + '\\]')) ctx.next()
        },
        (line, ctx, i, lines)=>{
            if (line.match('TUTOR\(.*' + move + '\)')){
                lines.splice(i, 1)
                ctx.stop()
            }
            if (line.match(/\[SPECIES_/)) {
                ctx.badReadMsg = `couldn't find move ${move} in tutor`
                ctx.stop()
            }
        }
    ]
    const gedit =  new GEdit("src/data/pokemon/tutor_learnsets.h", TutorCQ, "remove Tutor", execArray, {cf: true})
    gedit.go()
}