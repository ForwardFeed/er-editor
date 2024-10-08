import { locationEdit } from "./locations.js"
import { evosEdit, MoveEdit, LearnsetEdit, modSpecieBS, modAbi, modSpcType, modDescription, fixIllegalLevelLearnSet, setupSpecies} from "./species.js"
import { gameData } from "../data_version.js"
import { setupEditorBuilder } from "./trainers.js"
import { e } from "../utils.js"
import { setTrainerToEditMode } from "./trainers.js"
import { bridge } from '../context_bridge.js'
import { mod2LinesDesc, mod4LinesDesc, setToEditMove, setupEditMove } from "./moves.js"

export let dataList = [], pokeList = [], itemList = [], moveList = [], MOVEList = [], SPECIESList = [], 
trainerNAMEList = [], trainerClassList = [], trainerMusicList = [], teamPtrList = [], trainerPicList = [],
TMHMList = [], TutorList = [], ABIList = [], TYPEList = [], FLAGSList=[]


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
        MoveEdit(ev, "tutor", "tutor")
    }],
    ["#tmhm", (ev)=>{
        MoveEdit(ev, "tmhm", "tmhm")
    }],
    ["#eggmoves", (ev)=>{
        MoveEdit(ev, "eggmoves", "move")
    }],
    ["#learnset", (ev)=>{
        LearnsetEdit(ev)
    }],
    ["#learnset-title", (ev)=>{
        fixIllegalLevelLearnSet(ev)
    }],
    ["#species-basestats", (ev)=>{
        modSpecieBS(ev)
    }],
    [".species-ability", (ev)=>{
        modAbi(ev, "abis", ".species-ability")
    }],
    [".species-innate", (ev)=>{
        modAbi(ev, "inns", '.species-innate')
    }],
    [".spc-type", (ev)=>{
        modSpcType(ev)
    }],
    ["#species-misc", (ev)=>{
        modDescription(ev)
    }],
    ["#moves-data", ()=>{
        setToEditMove()
    }],
    ["#moves-edt-big-desc", (ev)=>{
        mod4LinesDesc(ev)
    }],
    ["#moves-edt-small-desc", (ev)=>{
        mod2LinesDesc(ev)
    }],
    ["#moves-edt-data", ()=>{
        setToEditMove()
    }],
    

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
        return // priority on the first one declared but one at a time
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
    setupSpecies()
}
TMHMList = [], TutorList = []
export function hydrateEditor(){
    setXList(gameData.tmusicT,trainerMusicList,"music-datalist")
    setXList(gameData.tclassT, trainerClassList, "tclass-datalist")
    setXList(gameData.species.map(x => x.name), pokeList, "poke-datalist")
    setXList(gameData.items, itemList, "item-datalist", x => x.name, x => x.NAME)
    setXList(gameData.moves, moveList, "move-datalist", x => x.name, x => x.NAME)
    setXList(gameData.moves, MOVEList, "move-datalist", x => x.NAME, x => x.NAME)
    setXList(gameData.species, SPECIESList, "SPECIES-datalist", x => x.name, x => x.NAME )
    setXList(gameData.trainers,trainerNAMEList,null, x => x.NAME)
    setTeamPtrList()
    setXList(gameData.tpicT, trainerPicList, "tpic-datalist")
    setXList(gameData.tmhms, TMHMList, "tmhm-datalist", x => gameData.moves[x].NAME, x => gameData.moves[x].NAME)
    setXList(gameData.tutors, TutorList, "tutor-datalist", x => gameData.moves[x].NAME, x => gameData.moves[x].NAME)
    setXList(gameData.abilities, ABIList, "abi-datalist", x => x.NAME, x => x.NAME)
    setXList(gameData.typeT, TYPEList, "type-datalist", x=> `TYPE_${x.toUpperCase()}`, x=> `TYPE_${x.toUpperCase()}`)
    setXList(gameData.flagsT, FLAGSList, "mvflags-datalist")
    setupEditMove()
}