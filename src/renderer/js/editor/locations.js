import { gameData } from "../data_version.js"
import { JSHAC, e } from "../utils.js"
import { currentLocID } from "../panels/locations_panel.js"
import { getSpritesURL } from "../panels/species_panel.js"
import { pokeList } from "./editor.js"
import { bridge } from '../context_bridge.js'

/**
 * 
 * @param {Event} ev 
 */
export function locationEdit(ev){
    const node = ev.target
    const panel = $(node).closest('.location-field')
    const locaField = panel.find('.location-title').text()
    if (!locaField) {
        console.warn(`Couldn't find location title with ${node}`)
        return false
    }
    if (panel.find('input').length) return // already in edit mode

    const xrateMap = {
        "Land": "land",
        "Water": "water",
        "Fishing": "fish",
        "Honey": "honey",
        "Rock-Smash": "rock",
        "Hiddens": "hidden",
    }
    const rateName = xrateMap[locaField]
    const rates = gameData.locations[rateName + "Rate"]
    const rows = $('#locations-'+rateName).find('.location-row')
    for (const i in rates){
        const row = rows.eq(i)
        const block = row.find('.specie-block')
        block.unbind();
        const img = block.find('img')
        let input = block.find('span')
        const monVal = input.text()
        input.replaceWith($(e('input', '', )))
        input = block.find('input')
        input.val(monVal)
        input.attr('list', "poke-datalist")
        block.on('click', ()=>{
            input.focus()
        })
        let prevMonID = pokeList.indexOf(input.val())
        input.on('keyup change', ()=>{
            const monID = pokeList.indexOf(input.val())
            if ( monID == -1 || monID == prevMonID) return
            prevMonID = monID //prevents repetition
            bridge.send('set-location', gameData.locations.maps[currentLocID].name, rateName, i, "species", gameData.species[monID].NAME)
            img.attr('src', getSpritesURL(gameData.species[monID].sprite))
            gameData.locations.maps[currentLocID][rateName][i][2] = monID
        })
        const levelRow = row.find('.location-lvl')
        const levelMin = e('input', 'edt-location-lvl')
        levelMin.value = gameData.locations.maps[currentLocID][rateName][i][0]
        $(levelMin).on('keyup change', ()=>{
            gameData.locations.maps[currentLocID][rateName][i][0] = levelMin.value
            bridge.send('set-location', gameData.locations.maps[currentLocID].name, rateName, i, "min_level", levelMin.value)
        })
        const levelMax = e('input', 'edt-location-lvl')
        levelMax.value = gameData.locations.maps[currentLocID][rateName][i][1]
        $(levelMax).on('keyup change', ()=>{
            bridge.send('set-location', gameData.locations.maps[currentLocID].name, rateName, i, "max_level", levelMax.value)
        })
        levelRow.empty().append(levelMin, levelMax).attr('class', 'location-lvl edt-level-row')
    }
}