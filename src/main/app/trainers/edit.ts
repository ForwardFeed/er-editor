import path from "path";
import { getRawFile, writeRawFile } from "../utils_edit";
import { TrainerPokemon } from "./teams";

function trainerToCData(poke: TrainerPokemon, comma: boolean = false){
    return `    {
    .lvl = 0,
    .species = ${poke.specie},
    .heldItem = ${poke.item || "ITEM_NONE"},
    .ability = ${poke.ability},
    .ivs = {${poke.ivs.join(', ')}},${poke.ivs[5]?"":"\n    .zeroSpeedIvs = TRUE,"}
    .evs = {${poke.evs.join(', ')}},
    .nature = ${poke.nature},
    .moves = ${poke.moves.join(', ')}
    }${comma?",\n":""}`
}

export function modTrainerParty(root_project: string, ptr: string, party: TrainerPokemon[]){
    const filepath = path.join(root_project, "/src/data/trainer_parties.h")
    getRawFile(filepath)
        .then((rawData)=>{
            let newPokeData = ""
            const partyLen = party.length
            for (let i = 0; i < partyLen; i++){
                const poke = party[i]
                newPokeData += trainerToCData(poke, i != (partyLen - 1))
            }
            let status = 0
            let lineMatch = 0
            const lines = rawData.split('\n')
            const lineLen = lines.length
            for (let i = 0; i < lineLen; i++){
                const line = lines[i]
                if (!line) continue
                if (status == 0 && line.match(ptr)){
                    lineMatch = i + 1
                    status = 1
                }
                if (status == 1 && line.match(";")){
                    lines.splice(lineMatch, i - lineMatch, newPokeData)
                    break
                }
            }
            writeRawFile(filepath, lines.join('\n'))
                .then(()=>{
                    console.log('success modifying trainer')
                })
                .catch((err)=>{
                    console.error(`couldn't modify trainer, reason: ${err}`)
                })
        })
        .catch((err)=>{
            console.log(err)
        })
}
