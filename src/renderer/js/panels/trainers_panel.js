import { getSpritesURL, redirectSpecie, getSpritesShinyURL } from "./species/species_panel.js"
import { queryFilter3 } from "../filters.js"
import { gameData } from "../data_version.js"
import { AisInB, e, JSHAC, capitalizeFirstLetter } from "../utils.js"
import { setFullTeam } from "./team_builder.js"
import { setTrainerToReadMode } from "../editor/trainers.js"

export let editedTrainerTeam = undefined, editedTrainerId = undefined

const PARTY_NORMAL = 0
const PARTY_ELITE = 1
const PARTY_HELL = 2

const trainerParam = {
  state: PARTY_NORMAL
}

export let currentTrainerID = 0

export function feedPanelTrainers(trainerID) {
  setTrainerToReadMode()
  currentTrainerID = trainerID
  $('#trainers-list').find('.sel-active').addClass("sel-n-active").removeClass("sel-active")
  let selectedNode = $('#trainers-list > .btn').eq(trainerID)
  if (+selectedNode.data("id") !== +trainerID) { selectedNode = $('#trainers-list > .btn').eq((+trainerID) + 1) }
  selectedNode.addClass("sel-active").removeClass("sel-n-active")

  const trainer = gameData.trainers[trainerID]
  $('#trainers-map').text(gameData.mapsT[trainer.map] || "Unknown")
  $('#trainers-tclass').text(setTrainerClassName(trainer.tclass))
  $('#trainers-name').text(trainer.name)
  $('#trainers-NAME').text(trainer.NAME)
  $('#trainers-gender').text(trainer.gender ? "Grill" : "Boi")
  $('#trainers-music').text(
    gameData.tmusicT[trainer.music].replace('TRAINER_ENCOUNTER_', '').toLowerCase().split('_').map(x => capitalizeFirstLetter(x)).join(' '))
  $('#trainers-pic').text(
    gameData.tpicT[trainer.pic].replace('TRAINER_PIC_', '').toLowerCase().split('_').map(x => capitalizeFirstLetter(x)).join(' '))

  setBaseTrainer(trainer)
  setRematchesBar(trainer.rem)
  setInsane(trainer)
  setHell(trainer)
  setPartyPanel(trainer.party)

}

export function setTrainerClassName(tclassID) {
  return gameData.tclassT[tclassID].replace('TRAINER_CLASS_', '').toLowerCase().split('_').map(x => capitalizeFirstLetter(x)).join(' ')
}

function setDouble(double) {
  const val = double ? "Double" : "Single"
  $('div#trainers-double').text(val)
  $('select#trainers-double').val(val)
}

function setBaseTrainer(trainer) {
  const party = trainer.party
  if (!party || party.length < 1) {
    $('#trainers-normal').empty()
    return
  }
  const nodeNormal = e('div')
  nodeNormal.innerText = "Normal"
  nodeNormal.className = "trainer-match-btn sel-active"
  nodeNormal.onclick = () => {
    trainerParam.state = PARTY_NORMAL
    setPartyPanel(party)
    $('#trainers-infobar1').find('.sel-active').addClass("sel-n-active").removeClass("sel-active")
    nodeNormal.className = "trainer-match-btn sel-active"
  }
  $('#trainers-normal').empty().append(nodeNormal)
  setDouble(trainer.db)
}

function setInsane(trainer) {
  const insaneTeam = trainer.insane
  if (!insaneTeam || insaneTeam.length < 1) {
    $('#trainers-elite').empty()
    return
  }
  const nodeElite = e('div')
  nodeElite.innerText = "Elite"
  nodeElite.className = "trainer-match-btn sel-n-active"
  nodeElite.onclick = () => {
    trainerParam.state = PARTY_ELITE
    setPartyPanel(insaneTeam)
    $('#trainers-infobar1').find('.sel-active').addClass("sel-n-active").removeClass("sel-active")
    nodeElite.className = "trainer-match-btn sel-active"
  }
  $('#trainers-elite').empty().append(nodeElite)
  setDouble(trainer.db)
  if (trainerParam.state === PARTY_ELITE) {
    nodeElite.onclick()
  }
}

function setHell(trainer) {
  const hellTeam = trainer.hell
  if (!hellTeam || hellTeam.length < 1) {
    $('#trainers-hell').empty()
    return
  }
  const nodeHell = e('div')
  nodeHell.innerText = "Hell"
  nodeHell.className = "trainer-match-btn sel-n-active"
  nodeHell.onclick = () => {
    trainerParam.state = PARTY_HELL
    setPartyPanel(hellTeam)
    $('#trainers-infobar1').find('.sel-active').addClass("sel-n-active").removeClass("sel-active")
    nodeHell.className = "trainer-match-btn sel-active"
  }
  $('#trainers-hell').empty().append(nodeHell)
  setDouble(trainer.db)
  if (trainerParam.state === PARTY_HELL) {
    nodeHell.onclick()
  }
}

function setRematchesBar(rematches) {
  if (rematches.length < 1) {
    return $('#trainers-rematch').empty()
  }
  const frag = document.createDocumentFragment()
  const spanInfo = e('span')
  spanInfo.innerText = "Rematches :"
  frag.append(spanInfo)
  for (const remI in rematches) {
    const rem = rematches[remI]
    const nodeRem = e('div')
    nodeRem.innerText = +remI + 1
    nodeRem.className = "trainer-match-btn sel-n-active"
    nodeRem.onclick = () => {
      $('#trainers-NAME').text(rem.NAME).val(rem.NAME)
      setPartyPanel(rem.party)
      $('#trainers-infobar1').find('.sel-active').addClass("sel-n-active").removeClass("sel-active")
      $('#trainers-rematch').children().eq(+remI + 1).addClass("sel-active").removeClass("sel-n-active")
      setDouble(rem.db)
    }
    frag.append(nodeRem)
  }
  $('#trainers-rematch').empty().append(frag)
}

function setPartyPanel(party) {
  if (party.length < 1) {
    return console.warn('party had team ' + party)
  }
  const frag = document.createDocumentFragment()
  for (const poke of party) {
    const pokeDiv = createPokemon(poke)
    pokeDiv.firstChild.onclick = () => {
      redirectSpecie(poke.spc)
    }
    frag.append(pokeDiv)
  }
  $('#trainers-team').empty().append(frag).append(getNodeRedirectToEditorPokemon(party))
}

export const statsOrder = [
  "HP",
  "Atk",
  "Def",
  "SpA",
  "SpD",
  "Spe",
]

export function createPokemon(poke) {
  const specie = gameData.species[poke.spc]
  const ability = gameData.abilities[specie.stats.abis[poke.abi]]
  const moves = [0, 1, 2, 3].map((x) => {
    const move = gameData.moves[poke.moves[x] || 0]
    if (move.usesHpType && poke.hpType) {
      return gameData.moves.find(it => it.NAME === `${move.NAME}|${poke.hpType}`)
    }
    return move
  })
  const item = gameData.items[poke.item]?.name
  const nature = gameData.natureT[poke.nature]



  const core = e('div', "trainers-pokemon")
  const leftPanel = e('div', "trainers-pokemon-left")
  const pokeName = e('div', "trainers-poke-specie", specie.name)
  const pokeImg = e('img', "trainer-poke-sprite")
  if (poke.isShiny) {
    pokeImg.src = getSpritesShinyURL(specie.sprite)
  } else {
    pokeImg.src = getSpritesURL(specie.sprite)
  }

  const pokeAbility = e('div', "trainers-poke-ability", ability?.name)
  const midPanel = e('div', "trainers-pokemon-mid")
  const pokeMoves = e('div', "trainers-poke-moves")
  for (const move of moves) {
    if (!move) continue
    const type1 = gameData.typeT[move.types[0]].toLowerCase()
    pokeMoves.append(e('div', `trainers-poke-move ${type1}-t`, move.name))
  }
  const rightPanel = e('div', "trainers-pokemon-right")
  const pokeItem = e('div', "trainers-poke-item", item)
  const textNature = getTextNature(nature)
  const pokeNature = e('div', "trainers-poke-nature", textNature)

  const pokeStats = e('div', "trainers-stats-row")
  const statBuffed = textNature.match(/(?<=\+)\w+/)?.[0]
  const statNerfed = textNature.match(/(?<=\-)\w+/)?.[0]
  for (const statIndex in statsOrder) {
    const stat = statsOrder[statIndex]
    const nerfedOrbuffed = stat === statBuffed ? "buffed" : stat === statNerfed ? "nerfed" : ""
    const evVal = poke.evs[statIndex]
    const evBuffd = evVal >= 200 ? "buffed" : ""
    const ivVal = poke.ivs[statIndex]
    const ivValNerfed = ivVal == 0 ? "nerfed" : ""
    if (statIndex != 5) {
      pokeStats.append(JSHAC([
        e('div', 'trainers-stats-col'), [
          e('div', `trainers-stats-name ${nerfedOrbuffed}`, stat),
          e('div', `trainers-poke-ivs`, '--'),
          e('div', `trainers-poke-evs ${evBuffd}`, evVal),
        ]
      ]))
    } else {
      pokeStats.append(JSHAC([
        e('div', 'trainers-stats-col'), [
          e('div', `trainers-stats-name ${nerfedOrbuffed}`, stat),
          e('div', `trainers-poke-ivs ${ivValNerfed}`, ivVal),
          e('div', `trainers-poke-evs ${evBuffd}`, evVal),
        ]
      ]))
    }

  }

  return JSHAC([
    core, [
      leftPanel, [
        pokeName,
        pokeImg,
        pokeAbility
      ],
      rightPanel, [
        midPanel, [
          pokeMoves,
          pokeItem,
          pokeNature
        ],
        pokeStats
      ]
    ]
  ])
}

const natureMap = {
  "Impish": "+Def -SpA",
  "Adamant": "+Atk -SpA",
  "Bold": "+Def -Atk",
  "Bashful": "--",
  "Jolly": "+Spe -SpA",
  "Gentle ": "+SpD -Def",
  "Calm": "+SpD -Atk",
  "Quiet": "+SpA -Spe",
  "Modest": "+SpA -Atk",
  "Timid": "+Spe -Atk",
  "Careful": "+SpD -SpA",
  "Hasty": "--",
  "Naughty": "+Atk -SpD",
  "Sassy": "+SpD -Spe",
  "Naive": "+Spe -SpD",
  "Brave": "+Atk -Spe",
  "Lonely": "+Atk -Def",
  "Relaxed": "+Def -Spe",
  "Lax": "+Def -SpD",
  "Hardy": "--",
  "Rash": "+SpA -SpD",
  "Mild": "+SpA -Def",
  "Quirky": "--",
  "Serious": "--",
}

export function getTextNature(nature) {
  return `${nature} (${natureMap[nature]})`
}

function getNodeRedirectToEditorPokemon(party) {
  const redirectTeamBuilder = () => {
    setFullTeam(party)
    editedTrainerTeam = $('#trainers-infobar1').find(".sel-active").text()
    editedTrainerId = currentTrainerID
    $('#btn-species').click()
    if ($('#btn-species').find('.big-select').text() === "Species") $('#btn-species').click()
  }
  return JSHAC([
    e('div', 'trainer-go-edition', null, { onclick: redirectTeamBuilder }), [
      e('div', 'trainer-redirect-arrow', 'Edit In Builder →')
    ]
  ])
}

const prefixTree = {
  treeId: "trainer"
}

export function buildTrainerPrefixTrees() {
  prefixTree.name = {}
  gameData.trainers.forEach((x, i, arr) => {
    //by the way i'm building the word array so i can match more widely *l*eader *w*inonna
    x.splicedName = x.searchName.split(' ').map(x => x.toLowerCase())
    for (const splice of x.splicedName) {
      const prefix = splice.charAt(0)
      if (!prefixTree.name[prefix]) prefixTree.name[prefix] = []
      prefixTree.name[prefix].push({ data: i, suggestions: x.name })
    }

  })
}


export const queryMapTrainers = {
  "name": (queryData, trainer) => {
    if (trainer.searchName === queryData) return [true, trainer.searchName, true]
    queryData = queryData.split(' ')
    if (!queryData.length) return false
    for (const subQueryData of queryData) {
      let hasSlicedMatched = false
      for (const splice of trainer.splicedName) {
        hasSlicedMatched = AisInB(subQueryData, splice) || hasSlicedMatched
      }
      if (!hasSlicedMatched) return false
    }
    return trainer.searchName

  },
  "map": (queryData, trainer) => {
    const map = gameData.mapsT[trainer.map]?.toLowerCase()
    if (map && AisInB(queryData, map)) return map
    return false
  },
  "specie": (queryData, trainer) => {
    const trainerMons = [].concat.apply(
      [], [
      trainer.party,
      [].concat.apply([], trainer.rem.map(x => x.party)),
      trainer.insane
    ]
    )
    for (const mon of trainerMons) {
      const pokemon = gameData.species[mon.spc].name.toLowerCase()
      if (AisInB(queryData, pokemon)) return pokemon
    }

    return false
  },
}
export function updateTrainers(searchQuery) {
  const trainers = gameData.trainers
  const nodeList = $('#trainers-list > .btn')
  let validID
  const matched = queryFilter3(searchQuery, trainers, queryMapTrainers, prefixTree)
  for (let i = 0; i < nodeList.length; i++) {
    const node = nodeList.eq(i)
    if (!matched || matched.indexOf(node.data("id")) != -1 || node.data("id") === undefined) {
      if (!validID) validID = i
      node.show()
    } else {
      node.hide()
    }
  }
  //if the current selection isn't in the list then change
  if (matched && matched.indexOf(currentTrainerID) == -1 && validID) feedPanelTrainers(validID)
}
