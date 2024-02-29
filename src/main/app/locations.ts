import * as FS from 'fs'
import * as Path from 'path'
import { Xtox } from './parse_utils'
import { GameData } from './main'
import { configuration } from './configuration'
import { CallQueue } from "../call_queue";

export const locationCQ = new CallQueue()

export interface Locations{
    maps: Location[],
    landRate: number[],
    waterRate: number[],
    fishRate: number[],
    honeyRate: number[],
    rockRate: number[],
    hiddenRate: number[],
    rodGrade: number[],

}
export interface Location {
    name: string,
    land: Encounter[] | undefined,
    landR: number | undefined,
    water: Encounter[] | undefined,
    waterR: number | undefined,
    fish: Encounter[] | undefined,
    fishR: number | undefined,
    honey: Encounter[] | undefined,
    honeyR: number | undefined,
    rock: Encounter[] | undefined,
    rockR: number | undefined,
    hidden: Encounter[] | undefined,
    hiddenR: number | undefined,
}

export interface Encounter{
    min: number,
    max: number,
    specie: string
}

interface rawGroups{
    old_rod: number[]
    good_rod: number[]
    super_rod: number[]
}   
interface rawField{
    type: string,
    encounter_rates: number[]
    groups: rawGroups
}
interface rawEncounter{
    min_level: number
    max_level: number
    species: string
}
interface rawEncounterList{
    encounter_rate: number,
    mons: rawEncounter[]

}
interface rawEncouters{
    map: string,
    base_label: string,
    land_mons: rawEncounterList
    water_mons: rawEncounterList
    rock_smash_mons: rawEncounterList
    fishing_mons: rawEncounterList
    honey_mons: rawEncounterList
    hidden_mons: rawEncounterList
}
interface rawEncounterGroup{
    label: string
    for_maps: boolean
    fields: rawField[]
    encounters: rawEncouters[]
}
interface rawLocations{
    wild_encounter_groups: rawEncounterGroup[]
}
let rawLocations = {} as rawLocations
const reverseMapID: string[] = []

function parse(data: string): Locations{
    rawLocations = JSON.parse(data) as rawLocations
    const locations = {} as Locations
    if (!rawLocations) return {} as Locations
    const locationsFieldJSON = rawLocations.wild_encounter_groups[0].fields
    const xmapMap: { [key: string]: string } = {
        "land_mons": "land",
        "water_mons": "water",
        "rock_smash_mons": "rock",
        "fishing_mons": "fish",
        "honey_mons": "honey",
        "hidden_mons": "hidden"
    }
    for(const field of locationsFieldJSON){
        const JSONF = field.type
        const F = xmapMap[JSONF] + "Rate" as keyof Locations
        Object.assign(locations, {[F]:field.encounter_rates})
        if (JSONF === "fishing_mons") {
            const group = field.groups
            locations.rodGrade = [
                group.old_rod[group.old_rod.length - 1],
                group.good_rod[group.good_rod.length - 1],
                group.super_rod[group.super_rod.length - 1],
            ]
        }
    }
    const xmapFields = [
        ["land_mons", "land"],
        ["water_mons", "water"],
        ["rock_smash_mons", "rock"],
        ["fishing_mons", "fish"],
        ["honey_mons", "honey"],
        ["hidden_mons", "hidden"]
    ]
    const locationsEncountersJSON = rawLocations.wild_encounter_groups[0].encounters.concat(rawLocations.wild_encounter_groups[3].encounters)
    const maps: Location[] = []
    for (const locationJSON of locationsEncountersJSON){
        const location = {} as Location 
        if (locationJSON.map) {
            location.name = Xtox('MAP_', locationJSON.map)
        } else {
            location.name = locationJSON.base_label.replace('gBerry', 'Tree ')
        }

        for(const field of xmapFields){
            const JSONF = field[0]
            const F = field[1] as keyof Location
            const FR = F + "R" as keyof Location
            if (locationJSON[JSONF]){
                Object.assign(location, {[FR]:locationJSON[JSONF].encounter_rate as number || -1})
                const listEncounters: Encounter[] = []
                for(const mon of locationJSON[JSONF].mons){
                    listEncounters.push({
                        specie: mon.species || "SPECIES_NONE",
                        min: mon.min_level || 1,
                        max: mon.max_level || 100,
                    })
                }
                Object.assign(location, {[F]:listEncounters})
            }
        }
        reverseMapID.push(location.name)
        maps.push(location)
    }
    locations.maps = maps
    return locations
}

export function getLocations(ROOT_PRJ: string, gameData: GameData): Promise<void>{
    return new Promise((resolve: ()=>void, reject)=>{
         // include 'src/data/region_map/region_map_entries.h' ?
        const filepath = Path.join(ROOT_PRJ, 'src/data/wild_encounters.json')
        FS.readFile(filepath, 'utf8', 
            (err_exist: NodeJS.ErrnoException | null, data: string) => {
                if (err_exist){
                    reject(`Error trying to read ${filepath}`)
                } else {
                    gameData.locations = parse(data)
                    resolve()
                }
        }) 
    })
}

export function setLocation(mapName: string, field: string, monID: number, key: string, value: string | number){
    if (!mapName || !field || !monID || !key || !value){
        return console.error('setLocation: missing :', mapName, field, monID, key, value)
    }
    const xrateMap = {
        "land": "land_mons",
        "water": "water_mons",
        "fish": "fishing_mons",
        "honey": "honey_mons",
        "rock": "rock_smash_mons",
        "hidden": "hidden_mons",
    }
    field = xrateMap[field]
    const IDMap = reverseMapID.indexOf(mapName)
    if (IDMap == -1) return
    
    for (const mapJSONID in rawLocations.wild_encounter_groups[0].encounters){
        const mapJSON = rawLocations.wild_encounter_groups[0].encounters[mapJSONID]
        if (!(Xtox('MAP_', mapJSON.map) == mapName)) continue
        if (!mapJSON[field]) {
            console.error(`field ${field} does not exist on ${mapJSON.map}`)
            return
        }
        rawLocations.wild_encounter_groups[0].encounters[mapJSONID][field].mons[monID][key] = value
        saveLocation()
        return
    }
    for (const mapJSON of rawLocations.wild_encounter_groups[3].encounters){
        if (!(Xtox('MAP_', mapJSON.map) == mapName)) continue
        if (!mapJSON[field]) {
            console.error(`field ${field} does not exist on ${mapJSON.map}`)
            return
        }
        rawLocations.wild_encounter_groups[0].encounters[field][monID][key] = value
        saveLocation()
        return
    }
    

}

function saveLocation(){
    const filepath = Path.join(configuration.project_root, 'src/data/wild_encounters.json')
    FS.writeFile(filepath, JSON.stringify(rawLocations, null as unknown as any[] , 2), (err_exist)=>{
        if (err_exist){
            console.error('could not write file', err_exist)
        } else {
            console.log('success, saving location')
        }
        locationCQ.unlock().poll()
    })
}