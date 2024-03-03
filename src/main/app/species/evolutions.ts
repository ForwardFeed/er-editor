import path from "path"
import { regexGrabStr } from "../parse_utils"
import { getRawFile, writeRawFile } from "../utils_edit"
import { CallQueue } from "../../call_queue";

export const evoCQ = new CallQueue("Evolutions")

export interface Result{
    fileIterator: number,
    evolutions: Map<string, Evolution[]>,
}

export interface Evolution {
    kind: string,
    specifier: string,
    into: string
}
interface Context {
    current: Evolution[],
    currKey: string,
    evolutions: Map<string, Evolution[]>,
    execFlag: string,
    stopRead: boolean,
}

function initContext(): Context{
    return {
        current: [],
        currKey: "",
        evolutions: new Map(),
        execFlag: "awaitForStart",
        stopRead: false,
    }
}

const executionMap: {[key: string]: (line: string, context: Context) => void} = {
    "awaitForStart": (line, context) => {
        if (line.match('gEvolutionTable')){
            context.execFlag = "main"
        }
    },
    "main": (line, context) =>{
        line = line.replace(/\s/g, '')
        if (!line) return
        if (line.match(/^\[SPECIES/)){
            if (context.currKey){
                context.evolutions.set(context.currKey, context.current)
                context.current = []
            }
            context.currKey = regexGrabStr(line, /(?<=^\[)\w+/)
        } if (line.match(/(?<={)EVO/)){
            const values = regexGrabStr(line, /(?<={)EVO[\w,]+/).split(',')
            context.current.push(
                {
                    kind: values[0],
                    specifier: values[1],
                    into: values[2],
                }
            )
           
        } else if (line.match('};')){
            context.evolutions.set(context.currKey, context.current)
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
        evolutions: context.evolutions
    }
}

export function addEvolution(root_project: string, specie: string, kind: string, reason: string, into: string){
    const filepath = path.join(root_project, "/src/data/pokemon/evolution.h")
    getRawFile(filepath)
        .then((rawData)=>{
            const lines = rawData.split('\n')
            const evoCData = `{${kind}, ${reason}, ${into}}},`
            let status = 0
            let linesEndArray = 0
            let space_pretify = 0
            const regexSpecie = new RegExp(`\\[${specie}\\]`)
            const lineLen = lines.length
            for (let i = 0; i < lineLen; i++){
                const line = lines[i]
                if (status == 0 && line.match(regexSpecie)){
                    console.log('found previous evolution line')
                    status = 1
                    space_pretify = line.indexOf("=")
                }
                if (status == 1 && line.match(/\}\},/)){
                    // remove previous end of array
                    lines.splice(i, 1, line.replace('}},', '},'))
                    // add the next line
                    const add = `${" ".repeat(space_pretify)}  ${evoCData}`
                    lines.splice(i + 1, 0, add)
                    console.log('added evolution to previous evolution line')
                    break
                } else if (line.match(';')){
                    linesEndArray = i
                }
            }
            if (status == 0){
                if (linesEndArray == 0) return console.error('the file was empty? something went wrong could not add evolution')
                console.log('did not found previous evolution line, adding a new evolution line')
                const add = `    [${specie}]	= {${evoCData}`
                lines.splice(linesEndArray, 0, add)
            }
            writeRawFile(filepath, lines.join('\n'))
                .then(()=>{
                    console.log('success adding evolution')
                })
                .catch((err)=>{
                    console.error(`couldn't write evolutions, reason: ${err}`)
                })
        })
        .catch((err)=>{
            console.log(err)
        })
        .finally(()=>{
            evoCQ.unlock().poll()
        })
}


export function removeEvolution(root_project: string, specie: string, evoIndex: number){
    const filepath = path.join(root_project, "/src/data/pokemon/evolution.h")
    getRawFile(filepath)
        .then((rawData)=>{
            const lines = rawData.split('\n')
            const lineLen = lines.length
            let status = 0
            let currentEvoIndex = 0
            let previousSpecieEvoLine = 0
            let index2Splice = 0
            const regexSpecie = new RegExp(`\\[${specie}\\]`)
            for (let i = 0; i < lineLen; i++){
                const line = lines[i]
                if (status == 1 && line.match('\\[')){
                    console.log(line, currentEvoIndex)
                    return console.error(`could not find the evolution of ${specie} with the index ${evoIndex}`)
                }
                if (status == 0 && line.match(regexSpecie)){
                    status = 1
                }
                if (status == 1 && line.match('\},')){
                    if (evoIndex == currentEvoIndex) {
                        index2Splice = i
                        if (line.match('\\[')){
                            if (line.match('\}\},')) break
                            status = 2
                            continue
                        } if (line.match('\}\},') && previousSpecieEvoLine){
                            lines.splice(previousSpecieEvoLine, 1, lines[previousSpecieEvoLine].replace('},', '}},'))
                        } else if (line.match('\}\},')){
                            previousSpecieEvoLine = i
                            status = 2
                            continue
                        }
                        break
                    } else {
                        previousSpecieEvoLine = i
                        currentEvoIndex += 1
                        continue
                    }
                }
                if (status == 2 && line.match('\},')){
                    const currData = line.match(/\{[^}{]+\}}?,?/)
                    if (!currData) {
                        return console.error('something went wrong when trying to substitute previous removed evolution line')
                    }
                    const add = `    [${specie}]	= ${evoIndex ?"": "{"}${currData[0]}`
                    lines.splice(i, 1, add)
                    break
                }
            }
            lines.splice(index2Splice, 1)
            if (status == 0){
                return console.error('could not find the specie ' + specie)
            }
            writeRawFile(filepath, lines.join('\n'))
                .then(()=>{
                    console.log('success adding evolution')
                })
                .catch((err)=>{
                    console.error(`couldn't write evolutions, reason: ${err}`)
                })
        })
        .catch((err)=>{
            console.log(err)
        })
        .finally(()=>{
            evoCQ.unlock().poll()
        })
}


export function modEvolution(root_project: string, specie: string, evoIndex: number, kind: string, reason: string, into: string){
    const filepath = path.join(root_project, "/src/data/pokemon/evolution.h")
    getRawFile(filepath)
        .then((rawData)=>{
            const lines = rawData.split('\n')
            let status = 0
            let currentEvoIndex = 0
            const regexSpecie = new RegExp(`\\[${specie}\\]`)
            const lineLen = lines.length
            for (let i = 0; i < lineLen; i++){
                const line = lines[i]
                if (status == 1 && line.match('\\[')){
                    return console.error(`could not find the evolution of ${specie} with the index ${evoIndex}`)
                }
                if (status == 0 && line.match(regexSpecie)){
                    console.log('found evolution line')
                    status = 1
                }
                if (status == 1 && line.match('\},')){
                    if (evoIndex == currentEvoIndex) {
                        const evoCData = `{${kind}, ${reason}, ${into}}`
                        const mod =  line.replace(/\{[^}{]+\}/, evoCData)
                        lines.splice(i, 1, mod)
                        console.log('modified one evolution')
                        break
                    } else {
                        currentEvoIndex += 1
                        continue
                    }
                }
            }
            if (status == 0){
                return console.error('could not find the specie ' + specie)
            }
            writeRawFile(filepath, lines.join('\n'))
                .then(()=>{
                    console.log('success modifying evolution')
                })
                .catch((err)=>{
                    console.error(`couldn't write evolutions, reason: ${err}`)
                })
        })
        .catch((err)=>{
            console.log(err)
        })
        .finally(()=>{
            evoCQ.unlock().poll()
        })
}