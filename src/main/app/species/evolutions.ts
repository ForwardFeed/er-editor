import { regexGrabStr } from "../parse_utils"
import { CallQueue } from "../../call_queue";
import { ExecArray, GEdit } from "../../gedit";
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

function createTextEvo(specie: string, evos: Evolution[]){
    const preText = `    [${specie}] = `
    return `${preText}{${evos.map((x, i)=>{
        let row = ""
        if (i){
            row+= `,\n${" ".repeat(preText.length)} `
        }
        row+=`{${x.kind}, ${x.specifier}, ${x.into}}`
        return row
    }).join('')}},`
}

export function replaceEvolution(specie: string, evos: Evolution[]){
    let begin = 0
    const execArray: ExecArray = [
        (line, ctx, i, lines)=>{
            if (line.match(`\\[${specie}\\]`)){
                begin = i
                ctx.next()
            } else if (line.match(';')){
                lines.splice(i,0, createTextEvo(specie, evos))
                ctx.next()
                ctx.stop()
            }
        },
        (line, ctx, i, lines)=>{
            if (line.match(/\[SPECIES\w+\]/) || line.match(";")){
                lines.splice(begin, i - begin, createTextEvo(specie, evos))
                ctx.stop()
            }
        }
    ]
    const gedit =  new GEdit("/src/data/pokemon/evolution.h", evoCQ, "replace Evolutions", execArray, {cf: true})
    gedit.go()
}