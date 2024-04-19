import { cubicRadial } from "../radial.js"
import { createInformationWindow, removeInformationWindow } from "../window.js"
import { setEvos, currentSpecieID , getSpritesURL, setAllMoves, updateBaseStats, setAbilities, setInnates, setTypes, abilitiesExtraType} from "../panels/species/species_panel.js"
import { gameData } from "../data_version.js"
import { MOVEList, pokeList, ABIList, TYPEList, TMHMList, TutorList } from "./editor.js"
import { JSHAC, e } from "../utils.js"
import { bridge } from '../context_bridge.js'
import { movePicker } from "../pickers.js"

/**
 * @returns {@type {import('../../../main/app/species/evolutions').Evolution}}}
 */
function evoCompactToEvo(/**@type {import('../../../main/app/compactify').CompactEvolution[]}*/ evo){
    return evo.map(x => {
        return {
            kind: gameData.evoKindT[x.kd],
            specifier: x.rs,
            into: gameData.species[x.in].NAME
        }
    })
    
}

function callbackModifyEvo(row, ev_cb){
    removeInformationWindow(ev_cb)
    const rowIndex = row.closest('#species-evos-locs').find('.evo-parent').index(row)
    const saveBtn = row.find('.edt-save-evo')
    if (!saveBtn[0].onclick) {
        saveBtn[0].onclick = ()=>{
            saveBtn.hide()
            const poke = gameData.species[currentSpecieID]
            bridge.send(
                'change-evolution',
                poke.NAME,
                evoCompactToEvo(poke.evolutions)
            )
        }
    }
    // EDIT INTO POKEMON
    const block = row.find('.specie-block')
    const img = block.find('img')
    let pokeInput = block.find('span')
    const monVal = pokeInput.text()
    pokeInput.replaceWith($(e('input', '', )))
    pokeInput = block.find('input')
    pokeInput.val(monVal)
    pokeInput.attr('list', "poke-datalist")
    block.unbind();
    block.on('click', ()=>{
        pokeInput.focus()
    })
    pokeInput.focus()
    let prevMonID = pokeList.indexOf(pokeInput.val())
    pokeInput.on('keyup change', ()=>{
        const monID = pokeList.indexOf(pokeInput.val())
        if ( monID == -1 || monID == prevMonID) return
        prevMonID = monID //prevents repetition
        saveBtn.show()
        img.attr('src', getSpritesURL(gameData.species[monID].sprite))
        gameData.species[currentSpecieID].evolutions[rowIndex].in = monID
    })
    // EDIT KIND OF EVOLUTIONS
    const kindSelect = e('select')
    gameData.evoKindT.map((x)=>{
        const option =  e("option",null, x.replace('EVO_', '').split('_').map(toLowerButFirstCase).join(' '))
        option.value = x
        kindSelect.append(option)
    })
    kindSelect.value = gameData.evoKindT[gameData.species[currentSpecieID].evolutions[rowIndex].kd]
    kindSelect.onchange = ()=>{
        gameData.species[currentSpecieID].evolutions[rowIndex].kd = gameData.evoKindT.indexOf(kindSelect.value)
        saveBtn.show()
    }
    // EDIT REASON OF EVOLUTION
    const reasonInput = e('input', )
    reasonInput.value = gameData.species[currentSpecieID].evolutions[rowIndex].rs
    reasonInput.onkeyup = reasonInput.onchange = ()=>{
        if (kindSelect.value === "EVO_ITEM" || kindSelect.value === "EVO_MEGA_EVOLUTION"){
            $(reasonInput).attr('list', 'item-datalist')
        } else if (kindSelect.value === "EVO_MOVE"){
            $(reasonInput).attr('list', 'move-datalist')
        } else if (kindSelect.value === "EVO_SPECIFIC_MON_IN_PARTY"){
            $(reasonInput).attr('list', 'SPECIES-datalist')
        } 
        else {
            $(reasonInput).attr('list', '')
        }
        gameData.species[currentSpecieID].evolutions[rowIndex].rs = reasonInput.value
        saveBtn.show()
    }
    row.find('.evo-reason').replaceWith(JSHAC([
        kindSelect,
        reasonInput
    ]))    
}


export function evosEdit(ev){
    const row = $(ev.target).closest('.evo-parent')
    //only allow edit if it's into
    const isRow = row.length && row.find('.evo-into').html().match(/^Into/)
    createInformationWindow(cubicRadial(
        [
            ['+ Add Evo', (ev_cb)=>{
                removeInformationWindow(ev_cb)
                const poke = gameData.species[currentSpecieID]
                poke.evolutions.push({
                    kd: 0,
                    rs: "0",
                    in: 0,
                })
                bridge.send(
                    'change-evolution',
                    poke.NAME,
                    evoCompactToEvo(poke.evolutions)
                )
                setEvos(poke.evolutions)
                callbackModifyEvo($(document).find('#species-evos .evo-parent:last'), ev_cb)
            }],
            [isRow? '~ Modify Evo': null, (ev_cb)=>{
                callbackModifyEvo(row, ev_cb)
            }],
            [isRow? '! Remove Evo': null, (ev_cb)=>{
                removeInformationWindow(ev_cb)
                const rowIndex = row.closest('#species-evos').find('.evo-parent').index(row)
                const poke = gameData.species[currentSpecieID]
                const evoRemoved =  poke.evolutions.splice(rowIndex, 1)[0]
                if (!evoRemoved.from){
                    const intoSpecie = gameData.species[evoRemoved.in]
                    for (const evoID in intoSpecie.evolutions){
                        const evo = intoSpecie.evolutions[evoID]
                        if (evo.from && evo.in == currentSpecieID &&
                            evo.kd == evoRemoved.kd && evo.rs == evoRemoved.rs){
                                intoSpecie.evolutions.splice(evoID, 1)
                                break
                            }
                    }
                }
                setEvos(poke.evolutions)
                bridge.send(
                    'change-evolution',
                    poke.NAME,
                    evoCompactToEvo(poke.evolutions.filter(x => !x.from))
                )
                
            }]
        ].filter(x => x[0]), "6em", "1em"
    ), ev, "mid", true, false)
}
function toLowerButFirstCase(word) {
    word = word.toLowerCase()
    return word.charAt(0).toUpperCase() + word.slice(1);
}
const evoKindList = [
    "EVO_LEVEL" ,
    "EVO_MEGA_EVOLUTION" ,
    "EVO_ITEM" ,
    "EVO_MOVE" ,
    "EVO_LEVEL_ATK_LT_DEF" ,
    "EVO_LEVEL_ATK_GT_DEF" ,
    "EVO_LEVEL_ATK_EQ_DEF" ,
    "EVO_LEVEL_SILCOON" ,
    "EVO_LEVEL_CASCOON" ,
    "EVO_PRIMAL_REVERSION" ,
    "EVO_ITEM_MALE" ,
    "EVO_ITEM_FEMALE" ,
    "EVO_LEVEL_NINJASK" ,
    "EVO_LEVEL_SHEDINJA" ,
    "EVO_MOVE_MEGA_EVOLUTION" ,
    "EVO_LEVEL_FEMALE" ,
    "EVO_LEVEL_MALE" ,
    "EVO_SPECIFIC_MON_IN_PARTY" ,
    "EVO_LEVEL_NIGHT" ,
    "EVO_LEVEL_DUSK" ,
    "EVO_LEVEL_DAY" ,
    "EVO_SPECIFIC_MAPSEC" 
]

function setMoveForAllNextEvos(specie, category, moveID, goDownwards=false){
    let canAddEggmove = true //only add eggmove to the lowest specie
    for (const evo of specie.evolutions){
        if (evo.from) canAddEggmove = false
        if (!goDownwards && evo.from) continue
        if (goDownwards && !evo.from) continue
        const nextEvo = gameData.species[evo.in]
        setMoveForAllNextEvos(nextEvo, category, moveID, goDownwards)
    }
    if (category === "eggmoves" && !canAddEggmove) return
    if (specie[category].indexOf(moveID) == -1 && specie.allMoves.indexOf(moveID) == -1) {
        specie[category].push(moveID)
        specie.allMoves.push(moveID)
        bridge.send('change-moves', category, specie.NAME, specie[category].map(x => gameData.moves[x].NAME))
    }
}

export function MoveEdit(ev, moveCat, moveCatDatalist){
    const row = $(ev.target).closest('.species-move-row')
    const rowIndex = row.parent().children().index(row[0])
    const specie = gameData.species[currentSpecieID]
    const move =gameData.moves[specie[moveCat][rowIndex]]
    const isRow = row.length > 0
    createInformationWindow(cubicRadial(
        [
            ['+Add Move', (ev_cb)=>{
                removeInformationWindow(ev_cb)
                const input = e('input', "builder-overlay-list", "MOVE_")
                input.setAttribute('list', `${moveCatDatalist}-datalist`)
                input.addEventListener('focusout', ()=>{
                    const moveID = MOVEList.indexOf(input.value)
                    const newMove = gameData.moves[moveID]
                    if (!newMove) return
                    if (specie.allMoves.indexOf(moveID) != -1) return
                    //if it's a move from tmhm, send it to tmhm
                    //except if it's to be send in eggmoves
                    if (moveCat !== "eggmoves"){
                        if (moveCat !== "tmhm" && TMHMList.indexOf(newMove.NAME) != -1){
                            moveCat = "tmhm"
                        }
                        if (moveCat !== "tutor" && TutorList.indexOf(newMove.NAME) != -1){
                            moveCat = "tutor"
                        }
                    }
                    //setMoveForAllNextEvos(specie, moveCat, moveID)
                    setMoveForAllNextEvos(specie, moveCat, moveID, true)
                    setAllMoves()
                })
                createInformationWindow(input, ev_cb, "focus", true, false)
            }],
            [isRow?`-Rem ${move?.name}`:null, (ev_cb)=>{
                removeInformationWindow(ev_cb)
                const moveID = specie[moveCat].splice(rowIndex, 1)[0]
                specie.allMoves.splice(specie.allMoves.indexOf(moveID), 1)
                if (moveCat === "eggmoves"){
                    function findEggSpecie(specieID){
                        const specie = gameData.species[specieID]
                        for (const evo of specie.evolutions){
                            if (evo.from) {
                                return findEggSpecie(evo.in)
                            }
                        }
                        return specieID
                    }
                    let eggSpecie = gameData.species[findEggSpecie(currentSpecieID)]
                    bridge.send('change-moves', moveCat, eggSpecie.NAME, eggSpecie.eggmoves.map(x => gameData.moves[x].NAME))
                } else {
                    bridge.send('change-moves', moveCat, specie.NAME, specie[moveCat].map(x => gameData.moves[x].NAME))
                }
                
                setAllMoves()
            }]
        ]
    , "6em", "1em"), ev, null, true, false)
}

/** 
 * @param {@type import('../../../main/app/compactify').CompactLevelUpMove} lrn 
 * @returns {@type import('../../../main/app/species/level_up_learnsets.js').LevelUpMove}
 */
function learnsetCompactToLearnset(lrn){
    return {
        level: lrn.lv,
        move: gameData.moves[lrn.id].NAME,
    }
}

function sendUpdateLearnset(){
    const specie = gameData.species[currentSpecieID]
    specie.learnset = specie.learnset.filter(x => x.id)
    setAllMoves()
    bridge.send('change-learnset', specie.lrnPtr, specie.learnset.map(x => learnsetCompactToLearnset(x)))
    
}

function showLearnsetEdit(ev_cb, newMove){
    const specie = gameData.species[currentSpecieID]
    function sortByLevel(a, b){
        return a.lv - b.lv
    }
    console.log(specie.allMoves)
    const learnableMoves = gameData.moves.map((_x,i)=>{
        if (specie.learnset.find(x => x.id === i)) return undefined
        if (specie.tmhm.indexOf(i) != -1) return undefined
        if (specie.tutor.indexOf(i) != -1) return undefined
        if (specie.eggmoves.indexOf(i) != -1) return undefined
        return i
    }).filter(x => x)
    let lastPickedMoveID = newMove.id
    const picker = movePicker(learnableMoves, (id)=>{
        lastPickedMoveID = id
    })
    const lvlInput = e('input', "overlay-stats-edit", newMove.lv)
    lvlInput.setAttribute('type', 'number')
    lvlInput.onkeyup = function(ev){
        ev.target.value = Math.min(ev.target.value.replace(/[^0-9]/g, "").replace(/^0(?=\d)/,''), 100)
    }
    const saveDiv = e('div', "btn edt-overlay-save-btn", [e('span', null, 'Save')], {
        onclick: ()=>{
            newMove.lv = lvlInput.value = +lvlInput.value
            const absoluteID = learnableMoves[lastPickedMoveID]
            console.log(gameData.moves[absoluteID].name)
            if (absoluteID == -1 || specie.allMoves.indexOf(absoluteID) != -1) {
                return
            }
            specie.allMoves.push(absoluteID)
            learnableMoves.splice(learnableMoves.indexOf(lastPickedMoveID), 1)

            newMove.id = absoluteID
            if (TMHMList.indexOf(gameData.moves[newMove.id].NAME) != -1){
                setMoveForAllNextEvos(specie, "tmhm", newMove.id, true)
                specie.tmhm.push(absoluteID)
                newMove.id = 0
            } else if (TutorList.indexOf(gameData.moves[newMove.id].NAME) != -1){
                specie.tutor.push(absoluteID)
                setMoveForAllNextEvos(specie, "tutor", newMove.id, true)
                newMove.id = 0
            } else {
                specie.learnset = specie.learnset.sort(sortByLevel)
            }
            setAllMoves()
        }
    })
    createInformationWindow(JSHAC([
        e('div', 'overlay-margin flex-col'), [
            lvlInput,
            picker,
            saveDiv
        ]
        
    ]), ev_cb, "focus", true, true, sendUpdateLearnset)
}


export function LearnsetEdit(ev){
    const row = $(ev.target).closest('.species-move-row')
    const rowIndex = row.parent().children().index(row[0])
    const specie = gameData.species[currentSpecieID]
    const move =gameData.moves[specie.learnset[rowIndex]?.id]
    createInformationWindow(cubicRadial(
        [
            ['+Add Move', (ev_cb)=>{
                removeInformationWindow(ev_cb)
                const newMove = {lv: 0, id: 0}
                specie.learnset.push(newMove)
                showLearnsetEdit(ev_cb, newMove)
                
            }],
            [move?`-Rem ${move?.name}`:null, (ev_cb)=>{
                removeInformationWindow(ev_cb)
                const moveID = specie.learnset.splice(rowIndex, 1)[0]
                specie.allMoves.splice(specie.allMoves.indexOf(moveID), 1)
                setAllMoves()
                sendUpdateLearnset()
            }],
            [move?`~Mod ${move?.name}`:null, (ev_cb)=>{
                removeInformationWindow(ev_cb)
                const newMove = specie.learnset[rowIndex]
                showLearnsetEdit(ev_cb, newMove)
                
            }]
        ]
    , "6em", "1em"), ev, null, true, false)
}

export function modSpecieBS(ev){
    const baseStatsTable = [
        'HP',
        'Atk',
        'Def',
        'SpA',
        'SpD',
        'Spe',
        'BST',
    ]
    const specie = gameData.species[currentSpecieID]
    specie.stats.modBase = structuredClone(specie.stats.base)
    let hasChanged = false
    const modPanel = JSHAC(
        baseStatsTable.map((x, i)=>{
            return JSHAC([
                e('div', 'stat-row'), [
                    e('span', 'stat-name', x),
                    e(`${i != 6?`input#m${x}`:`div#m${x}`}`, 'stat-num mod-stat-num', specie.stats.base[i], {
                        onkeyup: (ev_keyup)=>{
                            if (i == 6) return
                            hasChanged = true
                            const prevVal = specie.stats.modBase[i]
                            const val = ev_keyup.target.value =
                                Math.min(ev_keyup.target.value.replace('').replace(/[^0-9]/g, "").replace(/^0(?=\d)/,''), 255)
                            specie.stats.modBase[i] = val
                            specie.stats.modBase[6] += val - prevVal
                            document.getElementById(`mBST`).innerText = specie.stats.modBase[6]
                        }
                    })
                ]
            ])
        })
        , e('div#specie-basestats-mod'))
    
    createInformationWindow(modPanel, ev, "", false, true, ()=>{
        if (!hasChanged) return
        specie.stats.base = structuredClone(specie.stats.modBase)
        delete specie.stats.modBase
        updateBaseStats(specie.stats.base)
        bridge.send('change-bs', specie.NAME, specie.stats.base)
    })
}

export function modAbi(ev, abiCat, target){
    const rowIndex = $(target).index(ev.target)
    if (rowIndex == -1) return
    const specie = gameData.species[currentSpecieID]
    const abiID = specie.stats[abiCat][rowIndex]
    const abiNAME = gameData.abilities[abiID].NAME
    
    const input = e('input', 'builder-overlay-list', abiNAME)
    input.addEventListener('focus', ()=>{
        input.value = "ABILITY_"
    })
    input.setAttribute('list', 'abi-datalist')
    
    createInformationWindow(input, ev, "focus", true, true, ()=>{
        const nextAbi = ABIList.indexOf(input.value)
        if (nextAbi == -1 || abiID == nextAbi) return
        // because some abilities repeat themselves if the pokemon only have one ability
        // so i have to replace all
        specie.stats[abiCat].forEach((x, i, arr)=> {
            if (x == abiID) arr[i] = nextAbi
        })
        if (abiCat === "abis"){
            setAbilities(specie.stats.abis, specie)
        } else {
            setInnates(specie.stats.inns, specie)
        }
        bridge.send('change-abis', specie.NAME, abiCat, specie.stats[abiCat].map(x => gameData.abilities[x].NAME))
    })
}

export function modSpcType(ev){
    const rowIndex = $('.spc-type').index($(ev.target).closest('.spc-type'))
    const specie = gameData.species[currentSpecieID]
    const spcType = specie.stats.types[rowIndex]
    const input = e('input', 'builder-overlay-list', spcType)
    input.addEventListener('focus', ()=>{
        input.value = "TYPE_"
    })
    input.setAttribute('list', 'type-datalist')
    createInformationWindow(input, ev, "focus", true, true, ()=>{
        const nextType = TYPEList.indexOf(input.value)
        if (nextType == -1 || nextType == spcType) return
        specie.stats.types[rowIndex] = nextType
        setTypes([...specie.stats.types, abilitiesExtraType(specie.activeAbi, specie)], specie)
        bridge.send('change-spc-type', specie.NAME, specie.stats.types.map(x => `TYPE_${gameData.typeT[x].toUpperCase()}`))
    })
    
}

export function modDescription(ev){
    const specie = gameData.species[currentSpecieID]
    function splitIntoLines (text){
        text = text.split(' ')
        const lines = []
        const MAX_CHAR_LINE = 45
        for (let li=0, w=0; li < 4; li++){
            let line = ""
            for (let i=0; i<MAX_CHAR_LINE; i++){
                const word = text[w]
                w += 1
                if (!word) continue
                if (i + word.length > MAX_CHAR_LINE) {
                    w -= 1
                    break
                }
                line += word + " "
                i += word.length
            }
            if (li < 3) line = line.replace(/ $/, '\\n')
            lines.push(line)
        }
        return lines.filter(x => x)
    }
    function toFullCCode(text, ptr){
        return `const u8 ${ptr}[] = _(\n${splitIntoLines(text).map(x => `    "${x}"`).join('\n')});`
    }
    const panel = e('div', 'edt-panel-desc')
    const input = e('textarea', 'edt-desc-textarea', specie.dex.desc, {
        onkeyup: ()=>{
            specie.dex.desc = input.value = input.value.replace(/"/g, '')
            display.innerText = toFullCCode(input.value, specie.dex.descPtr)
            saveRow.style.display = "flex"
        }
    })
    const display = e('pre', 'edt-desc-display', toFullCCode(specie.dex.desc, specie.dex.descPtr))
    const saveRow = e('div', 'edt-desc-save btn', null, {
        onclick: ()=>{
            bridge.send('change-spc-desc', specie.dex.descPtr, splitIntoLines(input.value))
            saveRow.style.display = "none"
        }
    })
    const save = e('span', null, 'save !')
    saveRow.style.display = "none"
    input.setAttribute('spellcheck', 'false')

    createInformationWindow(JSHAC([
        input,
        display,
        saveRow, [save]
    ], panel), ev, "focus", true, true)
}

export function fixIllegalLevelLearnSet(ev){
    createInformationWindow(cubicRadial(
        [
            ['!force to TM/TUTOR', (ev_cb)=>{
                removeInformationWindow(ev_cb)
                const specie = gameData.species[currentSpecieID]
                let lvlupLen = specie.learnset.length
                for(let i=0; i < lvlupLen; i++){
                    const moveID = specie.learnset[i].id
                    const move = gameData.moves[moveID]
                    let shouldDelete = false
                    if (TMHMList.indexOf(move.NAME) != -1){
                        if (specie.tmhm.indexOf(moveID) != -1) continue
                        specie.tmhm.push(moveID)
                        shouldDelete = true
                    }
                    if (!shouldDelete && TutorList.indexOf(move.NAME) != -1){
                        if (specie.tutor.indexOf(moveID) != -1) continue
                        specie.tutor.push(moveID)
                        shouldDelete = true
                    }
                    if (shouldDelete){
                        specie.learnset.splice(i,1)[0]
                        i -= 1
                        lvlupLen -= 1
                    }
                }
                bridge.send('change-moves', 'tmhm', specie.NAME, specie.tmhm.map(x => gameData.moves[x].NAME))
                bridge.send('change-learnset', specie.lrnPtr, specie.learnset.map(x => learnsetCompactToLearnset(x)))
                bridge.send('change-moves', 'tutor', specie.NAME, specie.tutor.map(x => gameData.moves[x].NAME))
                setAllMoves()
            }],
        ], "6em", "1em"
    ), ev, "mid", true, false)
}