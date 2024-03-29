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

function getTutorText(specie: string, moves: string[]){
    return `    [${specie}] = TUTOR_LEARNSET
${moves.map(x => `        TUTOR(${x})`).join('\n')}  
        TUTOR_LEARNSET_END`
}

export function modTutor(specie: string, moves: string[]){
    const tutorText = moves.length ? getTutorText(specie, moves) : undefined
    let start = 0
    const execArray: ExecArray = [
        (line, ctx, i, lines)=>{
            if (line.match('\\[' + specie + '\\]')) {
                start = i
                ctx.next()
            }
            if (line.match(';')){
                if (!tutorText) {
                    ctx.next()
                    return
                }
                lines.splice(i,0,tutorText)
                ctx.next()
            }
        },
        (line, ctx, i, lines)=>{
            if (line.match('TUTOR_LEARNSET_END')){
                if (!tutorText) {
                    lines.splice(start, i - start + 1)
                    ctx.stop()
                    return 
                }
                lines.splice(start, i - start + 1, tutorText)
                ctx.stop()
            }
        }
    ]
    const gedit =  new GEdit("src/data/pokemon/tutor_learnsets.h", TutorCQ, "modify Tutor poke moves", execArray, {cf: true})
    gedit.go()
}

