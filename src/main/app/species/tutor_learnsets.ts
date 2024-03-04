import path from "path"
import { regexGrabStr } from "../parse_utils"
import { getRawFile, writeRawFile } from "../utils_edit"
import { CallQueue } from "../../call_queue";
import { configuration } from "../configuration";

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
    const filepath = path.join(configuration.project_root, "src/data/pokemon/tutor_learnsets.h")
    getRawFile(filepath)
        .then((rawData)=>{
            let status = 0
            const lines = rawData.split('\n')
            const lineLen = lines.length
            for (let i = 0; i < lineLen; i++){
                const line = lines[i].replace(/\/\/.*/, '')
                if (!line) continue
                if (status == 0 && line.match('\\[' + specie + '\\]')){
                    status = 1
                }
                if (status == 0) continue
                if (line.match('TUTOR_LEARNSET_END')){
                    lines.splice(i, 0, `        TUTOR(${move})`)
                    break
                }
            }
            writeRawFile(filepath, lines.join('\n'))
                .then(()=>{
                    console.log('success add Tutor')
                })
                .catch((err)=>{
                    console.error(`couldn't add Tutor, reason: ${err}`)
                })
                .finally(()=>{
                    TutorCQ.unlock().poll()
                })        
        })
        .catch((err)=>{
            console.log(err)
        })
}

export function removeTutor(specie: string, move: string){
    const filepath = path.join(configuration.project_root, "src/data/pokemon/tutor_learnsets.h")
    getRawFile(filepath)
        .then((rawData)=>{
            let status = 0
            const lines = rawData.split('\n')
            const lineLen = lines.length
            for (let i = 0; i < lineLen; i++){
                const line = lines[i].replace(/\/\/.*/, '')
                if (!line) continue
                if (status == 0 && line.match('\\[' + specie + '\\]')){
                    status = 1
                }
                if (status == 0) continue
                if (line.match('TUTOR\(.*' + move + '\)')){
                    lines.splice(i, 1)
                    break
                }
                if (line.match(/\[SPECIES_/)) break
            }
            if (status == 0){
                console.error(`couldn't find tutor ${move} for ${specie}`)
                TutorCQ.unlock().poll()
                return
            }
            writeRawFile(filepath, lines.join('\n'))
                .then(()=>{
                    console.log('success remove Tutor')
                })
                .catch((err)=>{
                    console.error(`couldn't remove Tutor, reason: ${err}`)
                })
                .finally(()=>{
                    TutorCQ.unlock().poll()
                })        
        })
        .catch((err)=>{
            console.log(err)
        })
}