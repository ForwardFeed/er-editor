import { gameData } from '../data_version.js'
import { teamData } from '../panels/team_builder.js'
import { editedTrainerTeam, editedTrainerId } from '../panels/trainers_panel.js'
import { JSHAC, capitalizeFirstLetter, e } from '../utils.js'
import { currentTrainerID, feedPanelTrainers } from '../panels/trainers_panel.js'
import { trainerNAMEList, trainerClassList, trainerMusicList, teamPtrList, trainerPicList } from './editor.js'
import { bridge } from '../context_bridge.js'
import { s } from './utils.js'
import { hydrateTrainers } from '../hydrate.js'
/**
 * @returns @type import('../../../main/app/trainers/teams').TrainerPokemon
 */
export function convertToTextableTrainerTeam(/** @type import('../../../main/app/compactify').CompactTrainerPokemon */ trainerPkm) {
  const poke = gameData.species[trainerPkm.spc]
  //down grades to pre-evolutions
  const specieName = poke.isMega ? gameData.species[poke.isMega].NAME : poke.NAME
  return {
    specie: specieName,
    ability: trainerPkm.abi,
    ivs: trainerPkm.ivs,
    evs: trainerPkm.evs,
    item: gameData.items[trainerPkm.item]?.NAME,
    nature: "NATURE_" + gameData.natureT[trainerPkm.nature].toUpperCase(),
    moves: trainerPkm.moves.map(x => gameData.moves[x].NAME.split("|")[0]),
    hpType: gameData.typeT[trainerPkm.hpType],
  }
}

function getTrainerPartyPtr(trainer) {
  if (trainer === "Normal") {
    return "ACE|" + gameData.trainers[editedTrainerId].NAME
  } else if (trainer === "Elite") {
    return "ELITE|" + gameData.trainers[editedTrainerId].NAME
  } else if (trainer === "Hell") {
    return "HELL|" + gameData.trainers[editedTrainerId].NAME
  } else {
    return "ACE|" + gameData.trainers[editedTrainerId].rem[trainer].NAME
  }
}

function setTrainerTeam(trainer, party) {
  if (trainer === "Normal") {
    gameData.trainers[editedTrainerId].party = party
  } else if (trainer === "Elite") {
    gameData.trainers[editedTrainerId].insane = party
  } else {
    gameData.trainers[editedTrainerId].rem[trainer] = party
  }
}
/**
 *
 * @param {string} name
 * @returns {string}
 */
function createPtr(name) {
  name = name.replace('TRAINER_', '').toLowerCase().split('_').map(x => capitalizeFirstLetter(x)).join('')
  let ptr = `sParty_${name.replace(/ /g, '')}`
  return (teamPtrList.indexOf(ptr) != -1) ? createPtr(name + "y") : ptr
}

function createTrainerName(name) {
  return (trainerNAMEList.indexOf(name) != -1) ? createTrainerName(name + "1") : name
}

function refreshEditTrainer(hasChanged = true) {
  feedPanelTrainers(currentTrainerID)
  if (hasChanged) gameData.trainers[currentTrainerID].hasChanged = true
  setTrainerToEditMode()
}

export function setupEditorBuilder() {
  $('#builder-edt-save').on('click', function () {
    if (editedTrainerTeam == undefined) return
    const toSend = []
    const toSave = []
    for (const poke of teamData) {
      if (!poke.spcName) continue
      toSend.push(convertToTextableTrainerTeam(poke))
      toSave.push(poke.toData())
    }
    setTrainerTeam(editedTrainerTeam, toSave)
    bridge.send('mod-trainer-party', getTrainerPartyPtr(editedTrainerTeam), toSend)
    $('#builder-edt-save').hide()
  })
  $('#builder-edt-save').hide()
  $('#trainers-save').on('click', saveTrainerData).hide()
  $('#trainers-rm-insane').on('click', function () {
    const trainer = gameData.trainers[currentTrainerID]
    bridge.send('rm-insane', trainer.NAME)
    trainer.insane = []
    trainer.ptrInsane = ""
    refreshEditTrainer(false)
  })
  $('#trainers-add-insane').on('click', function () {
    const baseParty = [{ spc: 1, moves: [], abi: 0, item: -1, nature: 0, evs: [], ivs: [31, 31, 31, 31, 31, 31] }]
    const trainer = gameData.trainers[currentTrainerID]
    trainer.insane = baseParty
    trainer.ptrInsane = createPtr(trainer.ptr.replace('sParty_', '') + "_Insane")
    teamPtrList.push(trainer.ptrInsane)
    bridge.send('add-insane', trainer.NAME, [convertToTextableTrainerTeam(baseParty[0])])
    refreshEditTrainer(false)
  })
  $('#trainers-rm-rem').on('click', function () {
    const activeRem = +($('#trainers-rematch').find(".sel-active").text())
    if (!activeRem || isNaN(activeRem)) return
    const trainer = gameData.trainers[currentTrainerID]
    bridge.send('remove-trainer', trainer.rem.splice(+activeRem - 1, 1)[0].NAME)
    refreshEditTrainer(false)
  })
  $('#trainers-add-rem').on('click', function () {
    const trainer = gameData.trainers[currentTrainerID]
    const remID = trainer.rem.length + 2
    const trainerName = trainer.name
    const baseName = trainer.NAME.replace(/_?\d$/, '')
    const trainerNAME = createTrainerName(`${baseName}_${remID}`)
    trainerNAMEList.push(trainerNAME)
    const remPtr = createPtr(trainer.NAME + remID)
    teamPtrList.push(remPtr)
    const newRem = {
      db: false,
      party: [{ spc: 1, moves: [], abi: 0, item: -1, nature: 0, evs: [], ivs: [31, 31, 31, 31, 31, 31] }],
      ptr: remPtr,
      NAME: trainerNAME
    }
    trainer.rem.push(newRem)
    if (!trainer.rematchM) {
      trainer.rematchM = trainer.NAME.replace('TRAINER_', 'REMATCH_')
    }
    bridge.send('add-trainer', {
      name: trainerName,
      NAME: trainerNAME,
      tclass: gameData.tclassT[trainer.tclass],
      double: false,
      party: [convertToTextableTrainerTeam(newRem.party[0])],
      insane: [],
      rematches: [],
      ptr: remPtr,
      ptrInsane: "",
      gender: trainer.gender,
      music: gameData.tmusicT[trainer.music],
      pic: gameData.tpicT[trainer.pic],
    }, trainer.rematchM, gameData.MAPST[trainer.map] || "EVER_GRANDE_CITY", trainer.NAME)
    refreshEditTrainer(false)
  })
  $('#trainers-remove').on('click', function () {
    if (confirm('This will delete the trainer right away without turning back, proceed?')) {
      const trainer = gameData.trainers[currentTrainerID]
      bridge.send('remove-trainer', trainer.NAME)
      for (const rem of trainer.rem) {
        bridge.send('remove-trainer', rem.NAME)
      }
      gameData.trainers.splice(currentTrainerID, 1)
      hydrateTrainers()
    }
  })
}

function appendAddTrainerBtn() {
  $("#trainers-list").prepend(e('div#add-trainer', 'btn data-list-row sel-n-active', "Add Trainer", {
    onclick: () => {
      addTrainer()
    }
  }))
}
/**
 * !!ignore rematches so far
 * @returns {@type import('../../../main/app/trainers/base_trainer.js').Trainer }
 */
function transformCompactToBaseTrainer(/** @type import('../../../main/app/compactify').CompactTrainers */ trainer) {
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

export function addTrainer() {
  const name = "New Trainer"
  const NAME = createTrainerName("TRAINER_NEW_TRAINER")
  trainerNAMEList.push(NAME)
  const defaultBaseTrainer = {
    NAME: NAME,
    name: name,
    ptr: createPtr(NAME),
    db: false,
    party: [{ spc: 1, moves: [], abi: 0, item: -1, nature: 0, evs: [], ivs: [31, 31, 31, 31, 31, 31] }],
    insane: [],
    rem: [],
    map: 0,
    tclass: 3,
    gender: false,
    music: 3,
    pic: 3,
    rematchM: ""
  }
  bridge.send('add-trainer', transformCompactToBaseTrainer(defaultBaseTrainer), "", "", "")
  gameData.trainers.push(defaultBaseTrainer)
  teamPtrList.push(defaultBaseTrainer.ptr)
  hydrateTrainers()
  $('#trainers-list div:last').click()[0].scrollIntoView({ behavior: "smooth" })
}

export function setTrainerToEditMode() {
  // just a check if we're already in edit mode
  if ($('input#trainers-tclass').length) return
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
  } else {
    $('#trainers-rm-rem').hide()
    $('#trainers-add-rem').show()
  }
  if (trainer.hasChanged) {
    $('#trainers-save').show()
  } else {
    $('#trainers-save').hide()
  }
  $('#trainers-infobar2').show()
  s($('#trainers-double'), $(JSHAC([
    e('select#trainers-double'),
    ["Double", "Single"].map((x) => {
      const optn = e('option', '', x)
      optn.value = x
      return optn
    })
  ])), "text2val")
  const double = $('#trainers-double')
  double[0].onchange = function () {
    const tPartyName = $('#trainers-infobar1').find(".sel-active").text()
    if (!tPartyName) return
    const dbB = double.val() === "Double"
    if (tPartyName === "Normal" || tPartyName === "Elite") {
      gameData.trainers[currentTrainerID].db = dbB
    } else {
      gameData.trainers[currentTrainerID].rem[tPartyName].db = dbB
    }
    refreshEditTrainer()
  }
  double.val(trainer.db === "Double" ? "Double" : "Single")
  s($('#trainers-gender'), $(JSHAC([
    e('select#trainers-gender'),
    ["Boi", "Grill"].map((x) => {
      const optn = e('option', '', x)
      optn.value = x
      return optn
    })
  ])), "text2val")
  const gender = $('#trainers-gender')

  gender[0].onchange = function () {
    trainer.gender = gender.val() === "Grill"
    refreshEditTrainer()
  }

  gender.val(trainer.gender ? "Grill" : "Boi")
  const NAME = s($('#trainers-NAME'), $(e('input#trainers-NAME')), "text2val")
  let baseNAME = NAME.val()
  let previousNAME = NAME.val()
  NAME[0].onkeyup = function () {
    // filter bad chars, forces to start with TRAINER_ and upper case
    NAME.val(NAME.val().replace(/[^\w_]/g, '').replace(/^(?!TRAINER_)/, 'TRAINER_').toUpperCase())
    const NAMEVal = NAME.val()
    if (NAMEVal == previousNAME) return
    //check if it doesn't enter in conflict with another trainer
    if (trainerNAMEList.indexOf(NAMEVal) != -1) {
      //conflict
      $('#trainers-infobar-err').show().text('This trainer name already exist')
      $('#trainers-save').hide()
      return
    }
    trainerNAMEList[trainerNAMEList.indexOf(previousNAME)] = NAMEVal
    previousNAME = NAMEVal
    $('#trainers-infobar-err').hide().text('')
    trainer.NAME = NAMEVal
    trainer.hasChanged = true
    $('#trainers-save').show()
  }
  NAME[0].addEventListener("focusout", (event) => {
    const NAMEVal = NAME.val()
    if ($('#trainers-infobar-err').show().text() || baseNAME === NAMEVal) return
    bridge.send('rename-trainer', baseNAME, NAMEVal)
    baseNAME = NAMEVal
  })

  const name = s($('#trainers-name'), $(e('input#trainers-name')), "text2val")
  name[0].onkeyup = function () {
    let nameVal = name.val()
    name.val(nameVal.replace(/[^\w_ ]+/g, ''))
    if (!nameVal) name.val(nameVal = trainer.name)
    trainer.name = nameVal
    $('#trainers-list > .btn').eq(currentTrainerID).text(nameVal)
    trainer.hasChanged = true
    $('#trainers-save').show()


  }
  const tclass = s($('#trainers-tclass'), $(e('input#trainers-tclass')), "text2val")
  tclass.attr('list', "tclass-datalist")
  tclass[0].onkeyup = function () {
    const tclassVal = tclass.val()
    if (trainerClassList.indexOf(tclassVal) != -1) {
      trainer.tclass = gameData.tclassT.indexOf(tclassVal)
      refreshEditTrainer()
    }
  }
  const music = s($('#trainers-music'), $(e('input#trainers-music')), "text2val")
  music.attr('list', "music-datalist")
  music[0].onkeyup = function () {
    const musicVal = music.val()
    if (trainerMusicList.indexOf(musicVal) != -1) {
      trainer.music = gameData.tmusicT.indexOf(musicVal)
      refreshEditTrainer()
    }
  }
  const pic = s($('#trainers-pic'), $(e('input#trainers-pic')), "text2val")
  pic.attr('list', "tpic-datalist")
  pic[0].onkeyup = function () {
    const picVal = pic.val()
    if (trainerPicList.indexOf(picVal) != -1) {
      trainer.pic = gameData.tpicT.indexOf(picVal)
      refreshEditTrainer()
    }
  }
  // if the button has ben deleted reinstore it
  if (!$('#add-trainer').length) {
    appendAddTrainerBtn()
  }
}


export function setTrainerToReadMode() {
  s($('#trainers-double'), $(e('div#trainers-double')), "val2text")
  s($('#trainers-gender'), $(e('div#trainers-gender')), "val2text")
  s($('#trainers-name'), $(e('div#trainers-name')), "val2text")
  s($('#trainers-NAME'), $(e('div#trainers-NAME')), "val2text")
  s($('#trainers-tclass'), $(e('div#trainers-tclass')), "val2text")
  s($('#trainers-music'), $(e('div#trainers-music')), "val2text")
  s($('#trainers-pic'), $(e('div#trainers-pic')), "val2text")
  $('#trainers-infobar2').hide()

}
function saveTrainerData() {
  $('#trainers-save').hide()
  gameData.trainers[currentTrainerID].hasChanged = false
  bridge.send('mod-trainer', transformCompactToBaseTrainer(gameData.trainers[currentTrainerID]))
}
