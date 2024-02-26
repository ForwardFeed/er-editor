import { locationEdit } from "./locations.js"
import { evosEdit } from "./species.js"
import { gameData } from "../data_version.js"
import { e } from "../utils.js"

export let dataList = undefined, pokeList = undefined, itemList=undefined, moveList=undefined, SPECIESList=undefined


export function getPokeList(){
    if (!pokeList) {
        pokeList = gameData.species.map(x => x.name)
        dataList = e("datalist")
        dataList.id = "poke-datalist"
        pokeList.map((x)=>{
            const option =  e("option",)
            option.value = x
            dataList.append(option)
        })
        $('body').append(dataList)
    }
    return pokeList
}

export function getItemList(){
    if (!itemList){
        itemList = []
        dataList = e("datalist")
        dataList.id = "item-datalist"
        gameData.items.map((x)=>{
            const option =  e("option",null, x.name)
            itemList.push(x.name)
            option.value = x.NAME
            dataList.append(option)
        })
        $('body').append(dataList)
    }
    return itemList
}
    
export function getMoveList(){
    if (!moveList){
        moveList = []
        dataList = e("datalist")
        dataList.id = "move-datalist"
        gameData.moves.map((x)=>{
            const option =  e("option",null, x.name)
            moveList.push(x.name)
            option.value = x.NAME
            dataList.append(option)
        })
        $('body').append(dataList)
    }
    return moveList
}

export function getSPECIESList(){
    if (!SPECIESList){
        SPECIESList = []
        dataList = e("datalist")
        dataList.id = "SPECIES-datalist"
        gameData.species.map((x)=>{
            const option =  e("option",null, x.name)
            SPECIESList.push(x.name)
            option.value = x.NAME
            dataList.append(option)
        })
        $('body').append(dataList)
    }
    return SPECIESList
}
/**
 * @type {Array.<Array<string, ()=>void>>}
 */
const targetibleMap = [
    ["#species-basestats", ()=>{
        console.log('species base stats')
    }], //
    [".location-field", (ev)=>{
        locationEdit(ev)
    }],
    ["#species-evos", (ev)=>{
        evosEdit(ev)
    }],
]
/**
 * 
 * @returns {string}
 * @param {HTMLElement} node 
 */
function nodeToTargetible(node){
    let targetible = node.tagName.toLowerCase()
    targetible += "#" + node.id.toLowerCase()
    targetible += "." + node.className
    return targetible
}
/**
 * 
 * @param {Event} ev 
 * @returns 
 */
function onRightClick(ev){
    const node = ev.target
    if (!node) return

    for (const target of targetibleMap){
        const closest = $(node).closest(target[0])
        if (!closest.length) continue
        target[1](ev)
    }
}

export function setupEditor(){
    (function( $ ) {
        $.fn.replaceTag = function(newTag) {
          var originalElement = this[0]
          , originalTag = originalElement.tagName
          , startRX = new RegExp('^<'+originalTag, 'i')
          , endRX = new RegExp(originalTag+'>$', 'i')
          , startSubst = '<'+newTag
          , endSubst = newTag+'>'
          , newHTML = originalElement.outerHTML
          .replace(startRX, startSubst)
          .replace(endRX, endSubst);
          this.replaceWith(newHTML);
        };
      })(jQuery);

    document.body.oncontextmenu = function() {return false;}
    document.addEventListener("mousedown", function(ev){
        if (ev.button != 2) return
        onRightClick(ev)
    }, true)
}

export function hydrateEditor(){
    getPokeList()
    getItemList()
    getMoveList()
    getSPECIESList()
}