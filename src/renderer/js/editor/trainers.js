import { gameData } from '../data_version.js'
import { teamData } from '../panels/team_builder.js'
import { editedTrainerTeam, editedTrainerId} from '../panels/trainers_panel.js'
import { JSHAC, e} from '../utils.js'
import { currentTrainerID, feedPanelTrainers } from '../panels/trainers_panel.js'
import { trainerNameList, trainerClassList, trainerMusicList} from './editor.js'
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
function refreshEditTrainer(){
    feedPanelTrainers(currentTrainerID)
    gameData.trainers[currentTrainerID].hasChanged = true
    setTrainerToEditMode()
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
        window.api.send('mod-trainer-party', getTrainerPartyPtr(editedTrainerTeam), toSend)
    })
    
    $('#trainers-rm-insane').on('click', function(){
        gameData.trainers[currentTrainerID].insane = []
        refreshEditTrainer()
    })
    $('#trainers-add-insane').on('click', function(){
        gameData.trainers[currentTrainerID].insane = [{spc: 1, moves: [], abi:0, item: -1, nature: 0, evs:[], ivs: [31,31,31,31,31]}]
        refreshEditTrainer()
    })
    $('#trainers-save').on('click', saveTrainerData).hide()
    $('#trainers-rm-rem').on('click', function(){
        const activeRem = $('#trainers-infobar').find(".sel-active").text()
        if (isNaN(+activeRem)) return
        gameData.trainers[currentTrainerID].rem.splice(+activeRem - 1, 1)
        refreshEditTrainer()
    })
    $('#trainers-add-rem').on('click', function(){
        console.log(gameData.trainers[currentTrainerID])
        gameData.trainers[currentTrainerID].rem.push({
            party: [{spc: 1, moves: [], abi:0, item: -1, nature: 0, evs:[], ivs: [31,31,31,31,31]}],
            double: false,
        })
        refreshEditTrainer()
    })
}



export function addTrainer(){
    console.log('adding trainer aa')
    gameData.trainers.push({
        NAME: "TRAINER_JAMES",
        name: "James"
    })
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
    if ($('input#trainers-tclass').length)  return
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
    if (trainer.hasChanged){
        $('#trainers-save').show()
    } else {
        $('#trainers-save').hide()
    }
    $('#trainers-infobar2').show()
    const double = s($('#trainers-double'), $(JSHAC(
        ["Double", "Single"].map((x)=>{
            const optn = e('option', '', x)
            optn.value = x
            return optn
        })
    , e('select#trainers-double'))), "text2val")
    double[0].onchange = function(){
        trainer.db = double.val() === "Double"
        refreshEditTrainer()
    }
    const gender = s($('#trainers-gender'), $(JSHAC(
        ["Boi", "Grill"].map((x)=>{
            const optn = e('option', '', x)
            optn.value = x
            return optn
        })
    , e('select#trainers-gender'))), "text2val")
    gender[0].onchange = function(){
        trainer.gender = gender.val() === "Grill"
        refreshEditTrainer()
    }
    const name = s($('#trainers-name'), $(e('input#trainers-name')), "text2val")
    let previousName = name.val()
    name[0].onkeyup = function(){
        // filter bad chars 
        name.val(name.val().replace(/[^\w_ ]+/g, ''))
        const nameVal = name.val()
        // name didn't changed, it cause bugs if i continue
        if (nameVal == previousName) return
        //check if it doesn't enter in conflict with another trainer
        if (trainerNameList.indexOf(nameVal) != -1){
            //conflict
            $('#trainers-infobar-err').show().text('This trainer name already exist')
            $('#trainers-save').hide()
            return
        }
        trainerNameList[trainerNameList.indexOf(previousName)] = nameVal
        previousName = nameVal
        $('#trainers-infobar-err').hide().text('')
        trainer.name = nameVal
        $('#trainers-list > .btn').eq(currentTrainerID).text(nameVal)
        trainer.hasChanged = true
        $('#trainers-save').show()

        
    }
    const tclass = s($('#trainers-tclass'), $(e('input#trainers-tclass')), "text2val")
    tclass.attr('list', "tclass-datalist")
    tclass[0].onkeyup = function(){
        const tclassVal = tclass.val()
        if (trainerClassList.indexOf(tclassVal) != -1 ) {
            trainer.tclass = gameData.tclassT.indexOf(tclassVal)
            refreshEditTrainer()
        } 
    }
    const music = s($('#trainers-music'), $(e('input#trainers-music')), "text2val")
    music.attr('list', "music-datalist")
    music[0].onkeyup = function(){
        const musicVal = music.val()
        if (trainerMusicList.indexOf(musicVal) != -1 ) {
            trainer.music = gameData.tMusicT.indexOf(musicVal)
            refreshEditTrainer()
        }
    }
}


export function setTrainerToReadMode(){
    s($('#trainers-double'), $(e('div#trainers-double')), "val2text")
    s($('#trainers-gender'), $(e('div#trainers-gender')), "val2text")
    s($('#trainers-name'), $(e('div#trainers-name')), "val2text")
    s($('#trainers-tclass'), $(e('div#trainers-tclass')), "val2text")
    s($('#trainers-music'), $(e('div#trainers-music')), "val2text")
    $('#trainers-infobar2').hide()

}
function saveTrainerData(){
    $('#trainers-save').hide()
    gameData.trainers[currentTrainerID].hasChanged = false
    console.log(gameData.trainers[currentTrainerID])
}
