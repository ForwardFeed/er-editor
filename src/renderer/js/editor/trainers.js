import { gameData } from '../data_version.js'
import { teamData } from '../panels/team_builder.js'
import { editedTrainerTeam, editedTrainerId} from '../panels/trainers_panel.js'
import { JSHAC, e} from '../utils.js'
import { currentTrainerID, feedPanelTrainers } from '../panels/trainers_panel.js'
import { trainerNameList } from './editor.js'
/**
 * @returns @type import('../../../main/app/trainers/teams').TrainerPokemon 
 */
export function convertToTextableTrainerTeam(/** @type import('../../../main/app/compactify').CompactTrainerPokemon */ trainerPkm){
    return {
        specie: gameData.species[trainerPkm.spc].NAME,
        ability: trainerPkm.abi,
        ivs: trainerPkm.ivs,
        evs: trainerPkm.evs,
        item: gameData.items[trainerPkm.item]?.NAME,
        nature: "NATURE_" + gameData.natureT[trainerPkm.nature].toUpperCase(),
        moves: trainerPkm.moves.map(x => gameData.moves[x].NAME)
    } 
}
function getTrainerPartyPtr(trainer){
    if (trainer === "Normal"){
        return gameData.trainers[editedTrainerId].ptr
    } else if (trainer === "Elite"){
        return gameData.trainers[editedTrainerId].ptrInsane
    } else {
        return gameData.trainers[editedTrainerId].rem[trainer].ptr
    }
}

function setTrainerTeam(trainer, party){
    if (trainer === "Normal"){
        return gameData.trainers[editedTrainerId].party = party
    } else if (trainer === "Elite"){
        return gameData.trainers[editedTrainerId].insane = party
    } else {
        return gameData.trainers[editedTrainerId].rem[trainer] = party
    }
}

export function setupEditorBuilder(){
    $('#builder-edt-save').on('click', function(){
        if (editedTrainerTeam == undefined) return
        const toSend = []
        const toSave = []
        for (const poke of teamData){
            if (!poke.spcName) continue
            toSend.push(convertToTextableTrainerTeam(poke))
            toSave.push(poke.toData())
        }
        setTrainerTeam(editedTrainerTeam, toSave)
        window.api.send('mod-trainer', getTrainerPartyPtr(editedTrainerTeam), toSend)
    })
    function refresh(){
        feedPanelTrainers(currentTrainerID)
        gameData.trainers[currentTrainerID].hasChanged = true
        setTrainerToEditMode()
    }
    $('#trainers-rm-insane').on('click', function(){
        gameData.trainers[currentTrainerID].insane = []
        refresh()
    })
    $('#trainers-add-insane').on('click', function(){
        gameData.trainers[currentTrainerID].insane = [{spc: 1, moves: [], abi:0, item: -1, nature: 0, evs:[], ivs: [31,31,31,31,31]}]
        refresh()
    })
    $('#trainers-save').on('click', saveTrainerData).hide()
    $('#trainers-rm-rem').on('click', function(){
        const activeRem = $('#trainers-infobar').find(".sel-active").text()
        if (isNaN(+activeRem)) return
        gameData.trainers[currentTrainerID].rem.splice(+activeRem - 1, 1)
        refresh()
    })
    $('#trainers-add-rem').on('click', function(){
        console.log(gameData.trainers[currentTrainerID])
        gameData.trainers[currentTrainerID].rem.push({
            party: [{spc: 1, moves: [], abi:0, item: -1, nature: 0, evs:[], ivs: [31,31,31,31,31]}],
            double: false,
        })
        refresh()
    })
}



export function addTrainer(){
    console.log('adding trainer aa')
    // need to add sParty_Blabla and the full team to trainer_parties.h
    // need to add the whole 
    /**
        [TRAINER_SAWYER_1] =
        {
            .trainerClass = TRAINER_CLASS_HIKER,
            .trainerPic = TRAINER_PIC_HIKER,
        },
     */ 
    // trainer aiFlags will always be AI_FLAG_CHECK_BAD_MOVE | AI_FLAG_TRY_TO_FAINT | AI_FLAG_CHECK_VIABILITY | AI_FLAG_CHECK_FOE | AI_FLAG_SMART_SWITCHING | AI_FLAG_HP_AWARE,
    // i need to edit to make it double or not in the UI! by making the whole pannel editable
    // maybe add a way to add a new party first
    // trainer name editable
    // trainer pic not yet but should and trainer class not yet but maybe will do
    // 
}
/**
 * @typedef
 * @param {JQuery} target 
 * @param {JQuery} newTarget 
 * @param {('text2val'|'val2text')} method 
 * @returns 
 */
function s(target, newTarget, method){
    target.replaceWith(newTarget)
    if (method === "text2val"){
        newTarget.val(target.text())
    }
    if (method === "val2text"){
        newTarget.text(target.val())
    }
    return newTarget
}

export function setTrainerToEditMode(){
    const trainer = gameData.trainers[currentTrainerID]
    if (trainer.insane.length) {
        $('#trainers-add-insane').hide()
        $('#trainers-rm-insane').show()
    } else {
        $('#trainers-rm-insane').hide()
        $('#trainers-add-insane').show()
    }
    if (trainer.rem.length) {
        $('#trainers-rm-rem').show()
        if (trainer.rem.length == 5) $('#trainers-add-rem').hide()
    } else{
        $('#trainers-rm-rem').hide()
        $('#trainers-add-rem').show()
    }
    const double = s($('#trainers-double'), $(JSHAC(
        ["Double", "Single"].map((x)=>{
            const optn = e('option', '', x)
            optn.value = x
            return optn
        })
    , e('select#trainers-double'))), "text2val")
    double[0].onchange = function(){
        $('#trainers-save').show()
    }
    const name = s($('#trainers-name'), $(e('input#trainers-name')), "text2val")
    $('#trainers-infobar2').show()
    name[0].onkeyup = function(){
        $('#trainers-save').show()
        const nameVal = name.val()
        console.log(trainer.name, trainerNameList.indexOf(nameVal) , nameVal)
        //check if it doesn't enter in conflict with another trainer
        if (nameVal != trainer.name && trainerNameList.indexOf(nameVal) != -1){
            //conflict
            $('#trainers-infobar-err').show().text('This trainer name already exist')
            return
        }
        $('#trainers-infobar-err').hide().text('')
    }
    if (trainer.hasChanged){
        $('#trainers-save').show()
    } else {
        $('#trainers-save').hide()
    }
    //need to make a selection for class
    //need to make a selection for gender: nothing or F_TRAINER_FEMALE
    //need to make the selection for music: _MUSIC
    
}


export function setTrainerToReadMode(){
    s($('#trainers-double'), $(e('div#trainers-double')), "val2text")
    s($('#trainers-name'), $(e('div#trainers-name')), "val2text")
    $('#trainers-infobar2').hide()

}
function saveTrainerData(){
    $('#trainers-save').hide()
    gameData.trainers[currentTrainerID].hasChanged = false
}