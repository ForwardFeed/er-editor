import { gameData } from "../data_version";
import { currentMoveID } from "../panels/moves_panel";
import { e } from "../utils";
import { TYPEList } from "./editor";
import { createCFontedText } from "./desc_utils.js"

export function setToEditMove(){
    $('#moves-edt-data, #moves-data').toggle()
    const move = gameData.moves[currentMoveID]
    console.log(gameData.flagsT)
    $('#moves-edt-name').val(move.name)
    $('#moves-edt-pwr').val(move.pwr)
    $('#moves-edt-acc').val(move.acc)
    $('#moves-edt-chance').val(move.chance)
    $('#moves-edt-pp').val(move.pp)
    $('#moves-edt-prio').val(move.prio)
    $('#moves-edt-types1').val(TYPEList[move.types[0]])
    $('#moves-edt-types2').val(TYPEList[move.types[1]])
    $('#moves-edt-big-desc').val(move.lDesc)
    $('#moves-edt-big-display').text(createCFontedText(move.lDesc, 4, 106))
    $('#moves-edt-small-desc').val(move.desc)
    $('#moves-edt-small-display').text(createCFontedText(move.desc, 2, 129))
    /*setTarget(move.target)
    $('#moves-edt-split').attr("src", `./icons/${gameData.splitT[move.split]}.png`);
    $('#moves-edt-split')[0].dataset.split = gameData.splitT[move.split].toLowerCase()
    //$('#moves-types').text('' + move.types.map((x)=>gameData.typeT[x]).join(' '))
    setTypes(move.types)
    $('#moves-desc').text(move.lDesc) //TODO fix the width of this
    listMoveFlags(move.flags.map((x) => gameData.flagsT[x]), $('#moves-flags'))*/
}


function hasBeenModified(){
    return
}

function setupTarget(){
    $('#moves-edt-target').append(gameData.targetT.map(x => e('option', null, x)))
    $('#moves-edt-target').on('change', function(){
        const move = gameData.moves[currentMoveID]
        move.target = gameData.targetT.indexOf($(this).val)
        hasBeenModified()
    })
}

export function setupEditMove(){
    $('#moves-edt-types1, #moves-edt-types2').on('focus', function(){
        $(this).val("TYPE_")
    }).on('focusout', function(){
        const rowIndex =  $('#moves-edt-types1, #moves-edt-types2').index($(this))
        const typeIndex = TYPEList.indexOf($(this).val())
        const move = gameData.moves[currentMoveID]
        if (typeIndex == -1 && $(this).val()) {
            $(this).val(TYPEList[move.types[rowIndex]])
            return
        }
        // force to have a type in slot one
        if (rowIndex == 0 && $(this).val() == ""){
            const type2 = move.types[1]
            if (type2 === undefined){
                move.types[0] = 0
                $(this).val(TYPEList[0])
            } else {
                move.types[0] = type2
                move.types[1] = undefined
                $(this).val(TYPEList[type2])
                $('#moves-edt-types2').val('')
            }
            hasBeenModified()
            return 
        }
        hasBeenModified()
        move.types[rowIndex] = typeIndex
    })
    $('#moves-edt-pwr').on('keyup', function(ev){
        const move = gameData.moves[currentMoveID]
        let pwr = $(this).val()
        if (pwr.includes("?")){
            pwr = 1
        } else if (pwr.includes("-") || ev.key === "ArrowLeft"){
            pwr = Math.max(move.pwr - 10, 0)
        } else if (pwr.includes("+") || ev.key === "ArrowRight"){
            pwr = move.pwr + 10
        } else {
            pwr = +pwr.replace(/[^0-9]/g, "") || 0
        }
        $(this).val(move.pwr = Math.min(pwr, 255))
        hasBeenModified()
    })
    $('#moves-edt-acc').on('keyup', function(ev){
        const move = gameData.moves[currentMoveID]
        let acc = $(this).val()
        if (acc.includes("-") || ev.key === "ArrowLeft"){
            acc = Math.max(move.acc - 10, 0)
        } else if (acc.includes("+") || ev.key === "ArrowRight"){
            acc = move.acc + 10
        } else {
            acc = acc.replace(/[^0-9]/g, "") || 0
        }
        $(this).val(move.acc = Math.min(acc, 100))
        hasBeenModified()
    })
    $('#moves-edt-pp').on('keyup', function(ev){
        const move = gameData.moves[currentMoveID]
        let pp = $(this).val()
        if (pp.includes("-") || ev.key === "ArrowLeft"){
            pp = Math.max(move.pp - 10, 0)
        } else if (pp.includes("+") || ev.key === "ArrowRight"){
            pp = move.pp + 10
        } else {
            pp = pp.replace(/[^0-9]/g, "") || 0
        }
        $(this).val(move.pp = Math.min(pp, 100))
        hasBeenModified()
    })
    $('#moves-edt-prio').on('keyup', function(ev){
        const move = gameData.moves[currentMoveID]
        let prio = $(this).val()
        if (ev.key === "ArrowLeft"){
            prio = Math.max(move.prio - 1, -7)
        } else if (ev.key === "ArrowRight"){
            prio = move.prio + 1
        } else {
            prio = prio.replace(/[^0-9-]/g, "").replace(/(?!^)-/g,'') || 0
        }
        $(this).val(move.prio = Math.min(prio, 7))
        hasBeenModified()
    })
    $('#moves-edt-chance').on('keyup', function(ev){
        const move = gameData.moves[currentMoveID]
        let chance = $(this).val()
        if (chance.includes("-") || ev.key === "ArrowLeft"){
            chance = Math.max(move.chance - 10, 0)
        } else if (chance.includes("+") || ev.key === "ArrowRight"){
            chance = move.chance + 10
        } else {
            chance = chance.replace(/[^0-9]/g, "") || 0
        }
        $(this).val(move.chance = Math.min(chance, 100))
        hasBeenModified()
    })
    $('#moves-edt-name').on('keyup', function(){
        const move = gameData.moves[currentMoveID]
        let name = $(this).val().replace(/["]/g, '')
        $(this).val( move.name = name)
        hasBeenModified()
    })
    $('#moves-edt-big-desc').on('keyup', function(ev){
        const val = $(this).val()
        console.log(createCFontedText(val, 4, 103))
    })
    $('#moves-edt-small-desc').on('keyup', function(ev){
        const val = $(this).val()
        console.log(createCFontedText(val, 2, 139))
    })
    setupTarget()
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