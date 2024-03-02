import { gameData } from '../data_version.js'
import { teamData } from '../panels/team_builder.js'
import { editedTrainerTeam, editedTrainerId} from '../panels/trainers_panel.js'
import { JSHAC, e} from '../utils.js'
import { currentTrainerID, feedPanelTrainers } from '../panels/trainers_panel.js'
import { trainerNameList, trainerClassList, trainerMusicList, teamPtrList, trainerPicList} from './editor.js'
import { bridge } from '../context_bridge.js'
import { s } from './utils.js'
import { hydrateTrainers } from '../hydrate.js'
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
/**
 * 
 * @param {string} name 
 * @returns {string}
 */
function createPtr(name){
    let ptr = `sParty_${name.replace(/ /g,'')}`
    return (teamPtrList.indexOf(ptr) != -1) ? createPtr(name + "_") : ptr
}

function createTrainerName(name){
    return (trainerNameList.indexOf(name) != -1) ? createTrainerName(name + "1") : name
}

function refreshEditTrainer(hasChanged=true){
    feedPanelTrainers(currentTrainerID)
    if (hasChanged) gameData.trainers[currentTrainerID].hasChanged = true
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
        bridge.send('mod-trainer-party', getTrainerPartyPtr(editedTrainerTeam), toSend)
    })
    $('#trainers-save').on('click', saveTrainerData).hide()
    $('#trainers-rm-insane').on('click', function(){
        const trainer = gameData.trainers[currentTrainerID]
        bridge.send('rm-insane', trainer.ptrInsane)
        trainer.insane = []
        trainer.ptrInsane = ""
        refreshEditTrainer(false)
    })
    $('#trainers-add-insane').on('click', function(){
        const baseParty = [{spc: 1, moves: [], abi:0, item: -1, nature: 0, evs:[], ivs: [31,31,31,31,31]}]
        const trainer = gameData.trainers[currentTrainerID]
        trainer.insane = baseParty
        trainer.ptrInsane = createPtr(trainer.ptr + "Insane")
        teamPtrList.push(trainer.ptrInsane)
        bridge.send('add-insane',trainer.NAME, trainer.ptrInsane, [convertToTextableTrainerTeam(baseParty[0])])
        refreshEditTrainer(false)
    })
    $('#trainers-rm-rem').on('click', function(){
        const activeRem = +($('#trainers-infobar').find(".sel-active").text())
        if (isNaN(+activeRem)) return
        bridge.send('rm-rem', gameData.trainers[currentTrainerID].rem.splice(+activeRem - 1, 1)[0].NAME)
        refreshEditTrainer(false)
    })
    $('#trainers-add-rem').on('click', function(){
        const trainer = gameData.trainers[currentTrainerID]
        const remID = trainer.rem.length + 2
        const trainerName = "TRAINER_" + createTrainerName(trainer.name + " " + remID)
        trainerNameList.push(trainerName)
        const trainerNAME = "TRAINER_" + trainerName.toUpperCase().replace(/ /g,' ')
        const remPtr = createPtr(trainer.name + remID)
        teamPtrList.push(remPtr)
        const newRem = {
            db: false,
            party: [{spc: 1, moves: [], abi:0, item: -1, nature: 0, evs:[], ivs: [31,31,31,31,31]}],
            ptr:remPtr,
        }
        trainer.rem.push(newRem)
        bridge.send('add-rem',trainerNAME, trainerName, remPtr, [convertToTextableTrainerTeam(newRem.party[0])])
        refreshEditTrainer(false)
    })
    $('#trainers-remove').on('click', function(){
        if (confirm('This will delete the trainer right away without turning back, proceed?')){
            //need to remove all sub teams linked to
            //but this will be done in the back
            bridge.send('remove-trainer', gameData.trainers[currentTrainerID].NAME)
            gameData.trainers.splice(currentTrainerID, 1)
            hydrateTrainers()
        }
    })
}


/**
 * !!ignore rematches so far
 * @returns {@type import('../../../main/app/trainers/names').Trainer }
 */
function transformCompactToBaseTrainer(/** @type import('../../../main/app/compactify').CompactTrainers */ trainer){
    return {
        NAME: trainer.NAME,
        name: trainer.name,
        tclass: gameData.tclassT[trainer.tclass],
        double: trainer.db,
        ptr: trainer.ptr,
        insanePtr: trainer.ptrInsane,
        party: trainer.party.map(x => convertToTextableTrainerTeam(x)),
        insane: trainer.insane.map(x => convertToTextableTrainerTeam(x)),
        rematches: [],
        gender: trainer.gender, 
        music: gameData.tmusicT[trainer.music],
        pic: gameData.tpicT[trainer.pic],
    }
}

export function addTrainer(){
    const name = createTrainerName("New Trainer")
    trainerNameList.push(name)
    const defaultBaseTrainer = {
        NAME: "TRAINER_" + name.toUpperCase().replace(/ /g,' '),
        name: name,
        ptr: createPtr(name),
        db: false,
        party: [{spc: 1, moves: [], abi:0, item: -1, nature: 0, evs:[], ivs: [31,31,31,31,31]}],
        insane: [],
        rem: [],
        map: 0,
        tclass: 3,
        gender: false,
        music: 3,
        pic: 3,
    }
    bridge.send('add-trainer', transformCompactToBaseTrainer(defaultBaseTrainer))
    gameData.trainers.push(defaultBaseTrainer)
    teamPtrList.push(defaultBaseTrainer.ptr)
    hydrateTrainers()
    $('#trainers-list div:last').click()[0].scrollIntoView({ behavior: "smooth" })
}

export function setTrainerToEditMode(){
    // just a check if we're already in edit mode  
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
            trainer.music = gameData.tmusicT.indexOf(musicVal)
            refreshEditTrainer()
        }
    }
    const pic = s($('#trainers-pic'), $(e('input#trainers-pic')), "text2val")
    pic.attr('list', "tpic-datalist")
    pic[0].onkeyup = function(){
        const picVal = pic.val()
        if (trainerPicList.indexOf(picVal) != -1 ) {
            trainer.pic = gameData.tpicT.indexOf(picVal)
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
    s($('#trainers-pic'), $(e('div#trainers-pic')), "val2text")
    $('#trainers-infobar2').hide()

}
function saveTrainerData(){
    $('#trainers-save').hide()
    gameData.trainers[currentTrainerID].hasChanged = false
    bridge.send('mod-trainer', transformCompactToBaseTrainer(gameData.trainers[currentTrainerID]))
}
