import { locationEdit } from "./locations.js"
import { evosEdit, MoveEdit } from "./species.js"
import { gameData } from "../data_version.js"
import { setupEditorBuilder } from "./trainers.js"
import { e } from "../utils.js"
import { setTrainerToEditMode } from "./trainers.js"
import { bridge } from '../context_bridge.js'

export let dataList = [], pokeList = [], itemList = [], moveList = [], SPECIESList = [], 
trainerNAMEList = [], trainerClassList = [], trainerMusicList = [], teamPtrList = [], trainerPicList = [],
TMHMList = [], TutorList = []


function setXList(inputArray, outputArray, dataListID, valTransformation = x => x, valOptionTransformation = x => x){
    let dataList
    if (dataListID){
        dataList = e("datalist")
        dataList.id = dataListID
    }
    inputArray.forEach((val)=>{
        outputArray.push(valTransformation(val))
        if (dataListID){
            const option =  e("option")
            option.value = valOptionTransformation(val)
            dataList.append(option)
        }
        if (dataListID) $('body').append(dataList)
    })
}

function setTeamPtrList(){
    gameData.trainers.forEach(function(val){
        teamPtrList.push(val.ptr, val.ptrInsane, ...val.rem.map(x => x.ptr))
    })
    teamPtrList = teamPtrList.filter(x => x)
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
    }],
    ["#tutor", (ev)=>{
        MoveEdit(ev, "tutor", TutorList)
    }],
    ["#tmhm", (ev)=>{
        MoveEdit(ev, "tmhm", TMHMList)
    }],
    ["#eggmoves", (ev)=>{
        MoveEdit(ev, "eggmoves", moveList)
    }],
    ["#learnset", (ev)=>{
        MoveEdit(ev, "learnset", moveList)
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
TMHMList = [], TutorList = []
export function hydrateEditor(){
    setXList(gameData.tmusicT,trainerMusicList,"music-datalist")
    setXList(gameData.tclassT, trainerClassList, "tclass-datalist")
    setXList(gameData.species.map(x => x.name), pokeList, "poke-datalist")
    setXList(gameData.items, itemList, "item-datalist", x => x.name, x => x.NAME)
    setXList(gameData.moves, moveList, "move-datalist", x => x.name, x => x.NAME)
    setXList(gameData.species, SPECIESList, "SPECIES-datalist", x => x.name, x => x.NAME )
    setXList(gameData.trainers,trainerNAMEList,null, x => x.NAME)
    setTeamPtrList()
    setXList(gameData.tpicT, trainerPicList, "tpic-datalist")
    setXList(gameData.tmhms, TMHMList, "tmhm-datalist", x => gameData.moves[x].NAME, x => gameData.moves[x].NAME)
    setXList(gameData.tutors, TutorList, "tutor-datalist", x => gameData.moves[x].NAME, x => gameData.moves[x].NAME)
}