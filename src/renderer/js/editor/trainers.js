import { gameData } from '../data_version.js'
import { teamData } from '../panels/team_builder.js'
import { editedTrainerTeam, editedTrainerId} from '../panels/trainers_panel.js'
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
        return gameData.trainers[editedTrainerId].ptrRem[trainer]
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
}