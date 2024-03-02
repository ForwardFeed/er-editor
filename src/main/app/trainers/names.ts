import { regexGrabNum, regexGrabStr } from "../parse_utils"
import { Xtox } from "../parse_utils";


// src/data/trainers.h
export interface Result{
    fileIterator: number,
    trainers: Map<string, BaseTrainer>,
}

export interface BaseTrainer {
    NAME: string,
    tclass: string,
    double: boolean,
    partyPtr: string,
    insanePtr: string,
    rematches: BaseTrainer[], // to be filled much later
    gender: boolean, // true w*man
    music: string,
    pic: string,
}

function initBaseTrainer(): BaseTrainer{
    return {
        NAME: "",
        tclass: "",
        double: false,
        partyPtr: "",
        insanePtr: "",
        rematches: new Array(5), //MAX_REMATCH NUMBER
        gender: false, // false m*le
        music: "",
        pic: "",
    }
}
 
interface Context{
    current: BaseTrainer,
    key: string,
    trainers: Map<string, BaseTrainer>,
    execFlag: string,
    stopRead: boolean,
}

function initContext(): Context{
    return {
        current: initBaseTrainer(),
        key: "",
        trainers: new Map(),
        execFlag: "main",
        stopRead: false
    }
}
const executionMap: {[key: string]: (line: string, context: Context) => void} = {
    "main" : (line, context) =>{
        if (line.match(/\[TRAINER_/)){
            if (context.key){
                context.current.NAME = context.key
                // now we need to integrate the rematches in function of the id
                const trainerNumber = regexGrabNum(context.key, /(?<=_)\d+$/, 0)
                context.key = Xtox('TRAINER_', context.key.replace(/_\d+$/g, ''))
                if (!context.key.includes('Grunt') || !trainerNumber){ //grunt are an exception
                    if (trainerNumber && trainerNumber != 1){
                        if (context.trainers.has(context.key)){ 
                            //if a trainer is already in place it means that we're in a rematch context
                            const preExistingTrainer = context.trainers.get(context.key)
                            if (!preExistingTrainer) return
                            preExistingTrainer.rematches[trainerNumber] = context.current
                            context.trainers.set(context.key,preExistingTrainer)
                        } else {
                            //eventually the base trainer will arrive after, 
                            //if he does not welp gonna check this at the end of the parsing
                            const placeHolderBaseTrainer = initBaseTrainer()
                            placeHolderBaseTrainer.rematches[trainerNumber] = context.current
                            context.trainers.set(context.key,placeHolderBaseTrainer)
                        }
                    } else {
                        if (context.trainers.has(context.key)){
                            const preExistingTrainer = context.trainers.get(context.key)
                            context.current.rematches = preExistingTrainer?.rematches || []
                        }
                        context.trainers.set(context.key, context.current)
                        
                    }
                } else {
                    context.trainers.set(context.key + " " + trainerNumber, context.current)
                }
                context.current = initBaseTrainer()
            }
            context.key = regexGrabStr(line, /TRAINER_\w+/)
        } else if (line.match('trainerClass')){
            context.current.tclass = regexGrabStr(line, /TRAINER_CLASS_\w+/)
        }else if (line.match('doubleBattle')){
            context.current.double = regexGrabStr(line.replace(/\s/g, ''), /(?<==)\w+/) === "TRUE" ? true : false
        } else if (line.match('partySizeInsane')){ //order is important with regex conflict with partysize
            context.current.insanePtr = regexGrabStr(line, /sParty_\w+/)
        } else if (line.match('partySize')){
            context.current.partyPtr = regexGrabStr(line, /sParty_\w+/)
        } else if (line.match('trainerPic')){
            context.current.pic = regexGrabStr(line, /TRAINER_PIC_\w+/)
        } else if (line.match('encounterMusic_gender')){
            if (regexGrabStr(line, 'F_TRAINER_FEMALE', "")) context.current.gender = true
            context.current.music = regexGrabStr(line, /TRAINER_\w+(_MUSIC_)\w+/)
        } else if (line.match('};')){
            if (context.key){
                context.trainers.set(context.key, context.current)
            }
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
        trainers: context.trainers
    }
}