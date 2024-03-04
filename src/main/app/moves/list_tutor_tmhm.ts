import { join } from "path"
import { GameData } from "../main"
import { getFileData } from "../utils"
import { regexGrabStr } from "../parse_utils"

export interface Result{
    fileIterator: number,
    tmhm: string[],
    tutors: string[],
}

interface Context{
    tmhm: string[],
    tutors: string[],
    execFlag: string, 
    stopRead: boolean,
}

function initContext(): Context{
    return {
        tmhm: [],
        tutors: [],
        execFlag: "awaitData",
        stopRead: false
    }
}

const executionMap: {[key: string]: (line: string, context: Context) => void} = {
    "awaitData" : (line, context) =>{
        if (line.match('#define ALL_TMS')){
            context.execFlag = "tmhm"
        }
    },
    "tmhm" : (line, context) =>{
        if (line.match('MOVE_')){
            context.tmhm.push(regexGrabStr(line, /MOVE_\w+/))
        } if (line.match('#define ALL_TUTORS')){
            context.execFlag = "tutors"
        }
    },
    "tutors" : (line, context) =>{
        if (line.match('MOVE_')){
            context.tutors.push(regexGrabStr(line, /MOVE_\w+/))
        } if (line.match('};')){
            context.stopRead = true
        }
    }
}


function parse(lines: string[], fileIterator: number): Result{
    const lineLen = lines.length
    const context = initContext()
    for (;fileIterator<lineLen; fileIterator++){
        let line = lines[fileIterator]
        executionMap[context.execFlag](line, context)
        if (context.stopRead) break
    }
    return {
        fileIterator: fileIterator,
        tmhm: context.tmhm,
        tutors: context.tutors,
    }
}

export function getTutorTMHMList(ROOT_PRJ: string, gameData: GameData): Promise<void>{
    return new Promise((resolved, rejected)=>{
        getFileData(join(ROOT_PRJ, 'include/tmhm_struct.h'), {filterComments: true, filterMacros: false, macros: new Map()})
            .then((filedata)=>{
                const result = parse(filedata.data.split('\n'), 0)
                gameData.tmhm = result.tmhm
                gameData.tutors = result.tutors
                resolved()
            })
            .catch((err)=>{
                rejected(err)
            })
    })
}