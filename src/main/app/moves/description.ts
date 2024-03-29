import { CallQueue } from "../../call_queue"
import { ExecArray, GEdit } from "../../gedit"

export const MoveDescCQ = new CallQueue("descriptions of moves")

export function changeBigDesc(ptr: string, lines: string[]){
    const newText = `static const u8 ${ptr}[] = _(\n${lines.map(x => `"${x}"`).join('\\n')});`
    let begin = 0
    const execArray: ExecArray = [
        (line, ctx, i, lines)=>{
            if (line.match('sMoveFourLineDescription_')){
                ctx.loopOnce().next()
            }
            if (i == lines.length - 1) {
                ctx.badReadMsg = "couldn't find any sMoveFourLineDescription_"
            }
        },
        (line, ctx, i, lines)=>{
            if (line.match(`${ptr}\\[\\]`)) {
                begin = i
                ctx.next()
            }
            if (i == lines.length - 1) {
                ctx.badReadMsg = "couldn't find ptr " + ptr
            }
        },
        (line, ctx, i, lines)=>{
            if (line.match(';')){
                lines.splice(begin, i - begin + 1, newText)
                ctx.stop()
            }
            //return 
        }
    ]
    const gedit =  new GEdit("src/data/text/text/move_description.h", MoveDescCQ, "changing move big desc", execArray, {cf: true})
    gedit.go()
}

export function changeSmallDesc(ptr: string, lines: string[]){
    const newText = `static const u8 ${ptr}[] = _(\n${lines.map(x => `"${x}"`).join('\\n')});`
    let begin = 0
    const execArray: ExecArray = [
        (line, ctx, i, lines)=>{
            if (line.match('sMoveFourLineDescription_')){
                ctx.loopOnce().next()
            }
            if (i == lines.length - 1) {
                ctx.badReadMsg = "couldn't find ptr " + ptr
            }
        },
        (line, ctx, i, lines)=>{
            if (line.match(`${ptr}\\[\\]`)) {
                begin = i
                ctx.next()
            }
            if (i == lines.length - 1) {
                ctx.badReadMsg = "couldn't find ptr " + ptr
            }
        },
        (line, ctx, i, lines)=>{
            if (line.match(';')){
                lines.splice(begin, i - begin + 1, newText)
                ctx.stop()
            }
            //return 
        }
    ]
    
    const gedit =  new GEdit("src/data/text/text/move_description.h",MoveDescCQ, "changing move small desc", execArray, {cf: true})
    gedit.go()
}