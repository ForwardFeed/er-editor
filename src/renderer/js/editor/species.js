import { cubicRadial } from "../radial.js"
import { createInformationWindow, removeInformationWindow } from "../window.js"
import { setEvos, currentSpecieID , getSpritesURL, setAllMoves} from "../panels/species_panel.js"
import { gameData } from "../data_version.js"
import { MOVEList, moveList, pokeList, TMHMList, TutorList } from "./editor.js"
import { JSHAC, e } from "../utils.js"
import { bridge } from '../context_bridge.js'

/**
 * @returns {@type {import('../../../main/app/species/evolutions').Evolution}}}
 */
function evoCompactToEvo(/**@type {import('../../../main/app/compactify').CompactEvolution[]}*/ evo){
    return evo.map(x => {
        return {
            kind: gameData.evoKindT[x.kd],
            specifier: x.rs,
            into: gameData.species[x.in].NAME
        }
    })
    
}

function callbackModifyEvo(row, ev_cb){
    removeInformationWindow(ev_cb)
    const rowIndex = row.closest('#species-evos').find('.evo-parent').index(row)
    // CALL TO SAVE
    const saveBtn = row.find('.edt-save-evo')
    if (!saveBtn[0].onclick) {
        saveBtn[0].onclick = ()=>{
            saveBtn.hide()
            const poke = gameData.species[currentSpecieID]
            const evo = poke.evolutions[rowIndex]
            bridge.send(
                'change-evolution',
                poke.NAME,
                evoCompactToEvo(poke.evolutions)
            )
        }
    }
    // EDIT INTO POKEMON
    const block = row.find('.specie-block')
    const img = block.find('img')
    let pokeInput = block.find('span')
    const monVal = pokeInput.text()
    pokeInput.replaceWith($(e('input', '', )))
    pokeInput = block.find('input')
    pokeInput.val(monVal)
    pokeInput.attr('list', "poke-datalist")
    block.unbind();
    block.on('click', ()=>{
        pokeInput.focus()
    })
    pokeInput.focus()
    let prevMonID = pokeList.indexOf(pokeInput.val())
    pokeInput.on('keyup change', ()=>{
        const monID = pokeList.indexOf(pokeInput.val())
        if ( monID == -1 || monID == prevMonID) return
        prevMonID = monID //prevents repetition
        saveBtn.show()
        img.attr('src', getSpritesURL(gameData.species[monID].sprite))
        gameData.species[currentSpecieID].evolutions[rowIndex].in = monID
    })
    // EDIT KIND OF EVOLUTIONS
    const kindSelect = e('select')
    gameData.evoKindT.map((x)=>{
        const option =  e("option",null, x.replace('EVO_', '').split('_').map(toLowerButFirstCase).join(' '))
        option.value = x
        kindSelect.append(option)
    })
    kindSelect.value = gameData.evoKindT[gameData.species[currentSpecieID].evolutions[rowIndex].kd]
    kindSelect.onchange = ()=>{
        gameData.species[currentSpecieID].evolutions[rowIndex].kd = gameData.evoKindT.indexOf(kindSelect.value)
        saveBtn.show()
    }
    // EDIT REASON OF EVOLUTION
    const reasonInput = e('input', )
    reasonInput.value = gameData.species[currentSpecieID].evolutions[rowIndex].rs
    reasonInput.onkeyup = reasonInput.onchange = ()=>{
        if (kindSelect.value === "EVO_ITEM" || kindSelect.value === "EVO_MEGA_EVOLUTION"){
            $(reasonInput).attr('list', 'item-datalist')
        } else if (kindSelect.value === "EVO_MOVE"){
            $(reasonInput).attr('list', 'move-datalist')
        } else if (kindSelect.value === "EVO_SPECIFIC_MON_IN_PARTY"){
            $(reasonInput).attr('list', 'SPECIES-datalist')
        } 
        else {
            $(reasonInput).attr('list', '')
        }
        gameData.species[currentSpecieID].evolutions[rowIndex].rs = reasonInput.value
        saveBtn.show()
    }
    row.find('.evo-reason').replaceWith(JSHAC([
        kindSelect,
        reasonInput
    ]))    
}


export function evosEdit(ev){
    const row = $(ev.target).closest('.evo-parent')
    //only allow edit if it's into
    const isRow = row.length && row.find('.evo-into').html().match(/^Into/)
    createInformationWindow(cubicRadial(
        [
            ['+ Add Evo', (ev_cb)=>{
                removeInformationWindow(ev_cb)
                const poke = gameData.species[currentSpecieID]
                poke.evolutions.push({
                    kd: 0,
                    rs: "0",
                    in: 0,
                })
                bridge.send(
                    'change-evolution',
                    poke.NAME,
                    evoCompactToEvo(poke.evolutions)
                )
                setEvos(poke.evolutions)
                callbackModifyEvo($(document).find('#species-evos .evo-parent:last'), ev_cb)
            }],
            [isRow? '~ Modify Evo': null, (ev_cb)=>{
                callbackModifyEvo(row, ev_cb)
            }],
            [isRow? '! Remove Evo': null, (ev_cb)=>{
                removeInformationWindow(ev_cb)
                const rowIndex = row.closest('#species-evos').find('.evo-parent').index(row)
                const poke = gameData.species[currentSpecieID]
                poke.evolutions.splice(rowIndex, 1)
                setEvos(poke.evolutions)
                bridge.send(
                    'change-evolution',
                    poke.NAME,
                    evoCompactToEvo(poke.evolutions)
                )
                
            }]
        ].filter(x => x[0]), "6em", "1em"
    ), ev, "mid", true, false)
}
function toLowerButFirstCase(word) {
    word = word.toLowerCase()
    return word.charAt(0).toUpperCase() + word.slice(1);
}
const evoKindList = [
    "EVO_LEVEL" ,
    "EVO_MEGA_EVOLUTION" ,
    "EVO_ITEM" ,
    "EVO_MOVE" ,
    "EVO_LEVEL_ATK_LT_DEF" ,
    "EVO_LEVEL_ATK_GT_DEF" ,
    "EVO_LEVEL_ATK_EQ_DEF" ,
    "EVO_LEVEL_SILCOON" ,
    "EVO_LEVEL_CASCOON" ,
    "EVO_PRIMAL_REVERSION" ,
    "EVO_ITEM_MALE" ,
    "EVO_ITEM_FEMALE" ,
    "EVO_LEVEL_NINJASK" ,
    "EVO_LEVEL_SHEDINJA" ,
    "EVO_MOVE_MEGA_EVOLUTION" ,
    "EVO_LEVEL_FEMALE" ,
    "EVO_LEVEL_MALE" ,
    "EVO_SPECIFIC_MON_IN_PARTY" ,
    "EVO_LEVEL_NIGHT" ,
    "EVO_LEVEL_DUSK" ,
    "EVO_LEVEL_DAY" ,
    "EVO_SPECIFIC_MAPSEC" 
]

export function MoveEdit(ev, moveCat, moveCatDatalist){
    const row = $(ev.target).closest('.species-move-row')
    const rowIndex = row.parent().children().index(row[0])
    const specie = gameData.species[currentSpecieID]
    const move =gameData.moves[specie[moveCat][rowIndex]]
    const isRow = row.length > 0
    createInformationWindow(cubicRadial(
        [
            ['+Add Move', (ev_cb)=>{
                removeInformationWindow(ev_cb)
                const input = e('input', "builder-overlay-list")
                input.setAttribute('list', `${moveCatDatalist}-datalist`)
                input.addEventListener('focusout', ()=>{
                    const moveID = MOVEList.indexOf(input.value)
                    const newMove = gameData.moves[moveID]
                    if (!newMove) return
                    specie[moveCat].push(moveID)
                    if (moveCat === "eggmoves"){
                        bridge.send('change-eggmoves', specie.NAME, specie.eggmoves.map(x => gameData.moves[x].NAME))
                    } else {
                        bridge.send('add-move', moveCat, specie.NAME, newMove.NAME)
                    }
                    
                    setAllMoves()
                })
                createInformationWindow(input, ev_cb, "focus", true, false)
            }],
            [isRow?`-Rem ${move?.name}`:null, (ev_cb)=>{
                removeInformationWindow(ev_cb)
                specie[moveCat].splice(rowIndex, 1)
                if (moveCat === "eggmoves"){
                    bridge.send('change-eggmoves', specie.NAME, specie.eggmoves.map(x => gameData.moves[x].NAME))
                } else {
                    bridge.send('remove-move', moveCat, specie.NAME, move.NAME)
                }
                
                setAllMoves()
            }]
        ]
    , "6em", "1em"), ev, null, true, false)
}

/** 
 * @param {@type import('../../../main/app/compactify').CompactLevelUpMove} lrn 
 * @returns {@type import('../../../main/app/species/level_up_learnsets.js').LevelUpMove}
 */
function learnsetCompactToLearnset(lrn){
    return {
        level: lrn.lv,
        move: gameData.moves[lrn.id].NAME,
    }
}

function sendUpdateLearnset(){
    const specie = gameData.species[currentSpecieID]
    bridge.send('change-learnset', specie.lrnPtr, specie.learnset.map(x => learnsetCompactToLearnset(x)))
    
}

function showLearnsetEdit(ev_cb, newMove){
    const specie = gameData.species[currentSpecieID]
    function sortByLevel(a, b){
        return a.lv - b.lv
    }
    const lvlInput = e('input', "overlay-stats-edit", newMove.lv)
    const input = e('input', "builder-overlay-list", gameData.moves[newMove.id].NAME)
    input.setAttribute('list', 'move-datalist')
    input.addEventListener('focus', ()=>{
        input.value = ""
    })
    input.addEventListener('focusout', ()=>{
        if (MOVEList.indexOf(input.value) == -1) {
            input.value = gameData.moves[newMove.id].NAME
            return
        }
        newMove.id = MOVEList.indexOf(input.value)
        specie.learnset = specie.learnset.sort (sortByLevel)
        setAllMoves()
        
    })
    lvlInput.setAttribute('type', 'number')
    lvlInput.onkeyup = function(ev){
        ev.target.value = Math.min(ev.target.value.replace(/[^0-9]/g, "").replace(/^0(?=\d)/,''), 100)
    }
    lvlInput.addEventListener('focusout', ()=>{
        newMove.lv = lvlInput.value = +lvlInput.value
        specie.learnset = specie.learnset.sort (sortByLevel)
        setAllMoves()
    })
    
    let row = e('div', 'species-move-row')
    row.append(lvlInput, input)
    createInformationWindow(row, ev_cb, "focus", true, true, sendUpdateLearnset)
}

export function LearnsetEdit(ev){
    const row = $(ev.target).closest('.species-move-row')
    const rowIndex = row.parent().children().index(row[0])
    const specie = gameData.species[currentSpecieID]
    const move =gameData.moves[specie.learnset[rowIndex]?.id]
    createInformationWindow(cubicRadial(
        [
            ['+Add Move', (ev_cb)=>{
                removeInformationWindow(ev_cb)
                const newMove = {lv: 0, id: 0}
                specie.learnset.push(newMove)
                showLearnsetEdit(ev_cb, newMove)
                
            }],
            [move?`-Rem ${move?.name}`:null, (ev_cb)=>{
                removeInformationWindow(ev_cb)
                const moveID = specie.learnset.splice(rowIndex, 1)[0]
                setAllMoves()
                sendUpdateLearnset()
            }],
            [move?`~Mod ${move?.name}`:null, (ev_cb)=>{
                removeInformationWindow(ev_cb)
                const newMove = specie.learnset[rowIndex]
                showLearnsetEdit(ev_cb, newMove)
                
            }]
        ]
    , "6em", "1em"), ev, null, true, false)
}