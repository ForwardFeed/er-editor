import { locationEdit } from "./locations.js"
import { evosEdit } from "./species.js"
import { gameData } from "../data_version.js"
import { setupEditorBuilder } from "./trainers.js"
import { e } from "../utils.js"
import { setTrainerToEditMode } from "./trainers.js"
import { bridge } from '../context_bridge.js'

export let dataList = [], pokeList = [], itemList = [], moveList = [], SPECIESList = [], 
trainerNAMEList = [], trainerClassList = [], trainerMusicList = [], teamPtrList = [], trainerPicList = []


function setTrainerPicList(){
    dataList = e("datalist")
    dataList.id = "tpic-datalist"
    gameData.tpicT.forEach(function(val){
        trainerPicList.push(val)
        const option =  e("option")
        option.value = val
        dataList.append(option)
    })
    $('body').append(dataList)
}

function setTeamPtrList(){
    gameData.trainers.forEach(function(val){
        teamPtrList.push(val.ptr, val.ptrInsane, ...val.rem.map(x => x.ptr))
    })
    teamPtrList = teamPtrList.filter(x => x)
}

function setTrainerNameList(){
    gameData.trainers.forEach(function(val){
        trainerNAMEList.push(val.NAME)
    })
}
function setTrainerMusicList(){
    dataList = e("datalist")
    dataList.id = "music-datalist"
    gameData.tmusicT.forEach(function(val){
        trainerMusicList.push(val)
        const option =  e("option")
        option.value = val
        dataList.append(option)
    })
    $('body').append(dataList)
}

function setTrainerClassList(){
    dataList = e("datalist")
    dataList.id = "tclass-datalist"
    gameData.tclassT.forEach(function(val){
        trainerClassList.push(val)
        const option =  e("option")
        option.value = val
        dataList.append(option)
    })
    $('body').append(dataList)
}

 function getPokeList(){
    if (!pokeList) {
        pokeList = gameData.species.map(x => x.name)
        dataList = e("datalist")
        dataList.id = "poke-datalist"
        pokeList.map((x)=>{
            const option =  e("option")
            option.value = x
            dataList.append(option)
        })
        $('body').append(dataList)
    }
    return pokeList
}

function getItemList(){
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
    ["#trainers-data", (ev)=>{
        setTrainerToEditMode(ev)
    }]
]
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
    setupEditorBuilder()
    $('#change-folder').on('click', function(){
        bridge.send('ask-for-folder')
    })
}

export function hydrateEditor(){
    getPokeList()
    getItemList()
    getMoveList()
    getSPECIESList()
    setTrainerNameList()
    setTrainerClassList()
    setTrainerMusicList()
    setTeamPtrList()
    setTrainerPicList()
}