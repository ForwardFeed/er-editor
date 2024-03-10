import { gameData } from "../data_version";
import { currentMoveID } from "../panels/moves_panel";
import { e } from "../utils";

export function setToEditMove(){
    $('#moves-edt-data, #moves-data').toggle()
    const move = gameData.moves[currentMoveID]
    $('#moves-edt-name').val(move.name)
    $('#moves-edt-pwr').val(move.pwr ? move.pwr == 1 ? "?" : move.pwr : "--")
    $('#moves-edt-acc').val(move.acc)
    $('#moves-edt-chance').val(move.chance)
    $('#moves-edt-pp').val(move.pp)
    $('#moves-edt-prio').val(move.prio)
    /*setTarget(move.target)
    $('#moves-edt-split').attr("src", `./icons/${gameData.splitT[move.split]}.png`);
    $('#moves-edt-split')[0].dataset.split = gameData.splitT[move.split].toLowerCase()
    //$('#moves-types').text('' + move.types.map((x)=>gameData.typeT[x]).join(' '))
    setTypes(move.types)
    $('#moves-desc').text(move.lDesc) //TODO fix the width of this
    listMoveFlags(move.flags.map((x) => gameData.flagsT[x]), $('#moves-flags'))*/
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