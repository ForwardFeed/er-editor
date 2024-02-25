import { cubicRadial } from "../radial.js"
import { createInformationWindow, removeInformationWindow } from "../window.js"
import { setEvos, currentSpecieID , getSpritesURL} from "../panels/species_panel.js"
import { gameData } from "../data_version.js"
import { getPokeList } from "./editor.js"
import { JSHAC, e } from "../utils.js"



function callbackModifyEvo(row, ev_cb){
    console.log(row)
    removeInformationWindow(ev_cb)
    const pokeList = getPokeList()
    const rowIndex = row.closest('#species-evos').find('.evo-parent').index(row)
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
        console.log('CHANGE POKEMON ! ' + monID) 
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
    }
    // EDIT REASON OF EVOLUTION
    const reasonInput = e('input', )
    reasonInput.value = gameData.species[currentSpecieID].evolutions[rowIndex].rs
    reasonInput.onkeyup = reasonInput.onchange = ()=>{
        gameData.species[currentSpecieID].evolutions[rowIndex].rs = reasonInput.value
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
                console.log(gameData.species[currentSpecieID].evolutions)
                gameData.species[currentSpecieID].evolutions.push({
                    kd: 0,
                    rs: "0",
                    in: 0,
                })
                setEvos(gameData.species[currentSpecieID].evolutions)
                callbackModifyEvo($(document).find('#species-evos .evo-parent:last'), ev_cb)
            }],
            [isRow? '~ Modify Evo': null, (ev_cb)=>{
                callbackModifyEvo(row, ev_cb)
            }],
            [isRow? '! Remove Evo': null, (ev_cb)=>{
                removeInformationWindow(ev_cb)
                const rowIndex = row.closest('#species-evos').find('.evo-parent').index(row)
                row.remove()
                gameData.species[currentSpecieID].evolutions.splice(rowIndex, 1)
                
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