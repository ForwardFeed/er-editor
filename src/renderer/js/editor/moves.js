import { gameData } from "../data_version";
import { s } from "./utils";
import { e } from "../utils";

function setToReadMode(){
    
}

function setToEditMove(){
    
}

// power
//type
//acc
//pp
// 'change-move'
/**
 * 
 * @param {  } move 
 * @returns { @type import('../../../main/app/moves/moves').Move}
 */
function compactMoveToMove( /** @type import('../../../main/app/compactify').compactMove */ move){
    return {
        NAME: move.NAME,
        name: move.name,
        shortName: move.sName,
        effect: gameData.effT[move.eff],
        power: move.pwr,
        types: move.types.map(x => `TYPE_${x.toUpperCase()}`),
        acc: move.acc,
        pp: move.pp,
        chance: move.chance,
        target: gameData.targetT[move.target],
        priority: move.prio,
        flags: move.flags.map(x => gameData.flagsT[x]),
        split: gameData.splitT[move.split],
        argument: move.arg,
        desc: move.desc,
        longDesc: move.lDesc,
    }
}

function moveCData(/** @type import('../../../main/app/moves/moves').Move */ move){
return`    [${move.NAME}] =
    {
        .effect   = ${move.effect},
        .power    = ${move.power},
        .type     = ${move.types[0]},
${move.types[1]?`        .type2    = ${move.types[1]},\n`:""}\
        .accuracy = ${move.acc},
        .pp       = ${move.pp},
        .secondaryEffectChance = ${move.chance},
        .target   = ${move.target},
        .flags    = ${move.flags.join(' | ')},
        .split    = ${move.split},
    },
`
}