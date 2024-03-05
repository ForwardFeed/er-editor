import path from "path"
import { CallQueue } from "./call_queue"
import { getRawFile, writeRawFile } from "./app/utils_edit"
import { configuration } from "./app/configuration"

/**
 * Status will point towards the ExecArray index to be executed at each line read
 * Once the read lines loop is over, if the Status is still 0, it will not write the lines and will print the error
 * from badReadMsg into the stderr.
 * The lines stop read once all lines are read or if the stopRead have been set to true.
 * reRead prop will tell the parser to reread the line it was on, it is usefull if you change status 
 * but maybe the next status will need the data available on the line it was already on
 */

export class GEditContext{
    status: number = 0
    next(): GEditContext{
        this.status++
        return this
    }
    reRead: boolean = false
    loopOnce(): GEditContext{
        this.reRead = true
        return this
    }
    badReadMsg: string = ""
    stopRead: boolean = false
    stop(): GEditContext{
        this.stopRead = true
        return this
    }
}

export type ExecArray = Array<(line: string, ctx: GEditContext, i: number, lines: string[])=>void>

export type GEditParam = {
    cf: boolean // comments filtering
}

/**
 * Genetic Edit
 */
export class GEdit{
    relLilepath: string
    queue: CallQueue
    objective: string
    execMap: ExecArray
    param: GEditParam
    /**
     * 
     * @param relFilepath Relative file path to the project root
     * @param queue Call queue for the project
     * @param objective Objective of the edition
     * @param execArray all the steps of the parsing and reading
     */
    constructor(relFilepath: string, queue: CallQueue, objective: string, execArray: ExecArray, param: GEditParam = {cf: false}){
        this.relLilepath = path.join(configuration.project_root, relFilepath)
        this.queue = queue
        this.objective = objective
        this.execMap = execArray
        this.param = param
    }
    /**
     * Entry point of execution, the rest is automatic
     */
    go(){
        getRawFile(this.relLilepath)
            .then((rawData)=>{
                this.onRead(rawData)
            })
            .catch((reason)=>{
                this.onErrorRead(reason)
            })
    }
    private onErrorRead(reason: any){
        console.error(`Error while parsing ${this.relLilepath}, reason: ${reason}`)
    }
    private onRead(rawData: string){
        const lines = rawData.split('\n')
            const ctx:  GEditContext = new GEditContext()
            const lineLen = lines.length
            for (let i = 0; i < lineLen; i++){
                const line = this.param.cf?lines[i]?.replace(/\/\/.*/, ''):lines[i]
                if (!line) continue
                this.execMap[ctx.status](line, ctx, i, lines)
                if (ctx.stopRead) break
                if (ctx.reRead) {
                    ctx.reRead = false
                    i = i -1
                    continue
                }
            }
            if (!ctx.status || ctx.badReadMsg){
                return this.onBadRead(ctx.badReadMsg)
            }
            this.write(lines)
    }
    private onBadRead(msg: string){
        console.error(`${msg}`)
        this.queue.unlock().poll()
    }
    private write(lines: string[]){
        writeRawFile(this.relLilepath, lines.join('\n'))
                .then(()=>{
                    console.log(`success ${this.objective}`)
                })
                .catch((err)=>{
                    console.error(`couldn't write ${this.relLilepath}, reason: ${err}`)
                })
                .finally(()=>{
                    this.queue.unlock().poll()
                })
    }
}

/** TEMPLATE */
/*
const CQ =  new CallQueue('test')


const execArray: ExecArray = [
    (line, ctx, _i, _lines)=>{
        
    },
    (line, ctx, _i, _lines)=>{
        
    }
]

const gedit =  new GEdit("",CQ, "", execArray, {cf: true})
gedit.go()

*/