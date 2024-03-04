import path from "path"
import { configuration } from "../configuration"
import { regexGrabStr } from "../parse_utils"
import { getRawFile, writeRawFile } from "../utils_edit"
import { CallQueue } from "../../call_queue";

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
    const filepath = path.join(configuration.project_root, "src/data/pokemon/tmhm_learnsets.h")
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
                if (line.match('TMHM_LEARNSET_END')){
                    lines.splice(i, 0, `        TM(${move})`)
                    break
                }
            }
            writeRawFile(filepath, lines.join('\n'))
                .then(()=>{
                    console.log('success add TMHM')
                })
                .catch((err)=>{
                    console.error(`couldn't add TMHM, reason: ${err}`)
                })
                .finally(()=>{
                   TMHMCQ.unlock().poll()
                })        
        })
        .catch((err)=>{
            console.log(err)
        })
}

export function removeTMHM(specie: string, move: string){
    const filepath = path.join(configuration.project_root, "src/data/pokemon/tmhm_learnsets.h")
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
                if (line.match('TM\(.*' + move + '\)')){
                    lines.splice(i, 1)
                    break
                }
                if (line.match(/\[SPECIES_/)) break
            }
            if (status == 0){
                console.error(`couldn't find tmhm ${move} for ${specie}`)
                TMHMCQ.unlock().poll()
                return
            }
            writeRawFile(filepath, lines.join('\n'))
                .then(()=>{
                    console.log('success remove TMHM')
                })
                .catch((err)=>{
                    console.error(`couldn't remove TMHM, reason: ${err}`)
                })
                .finally(()=>{
                   TMHMCQ.unlock().poll()
                })        
        })
        .catch((err)=>{
            console.log(err)
        })
}