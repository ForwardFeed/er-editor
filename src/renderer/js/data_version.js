import { hydrate } from './hydrate.js'
import { saveToLocalstorage, fetchFromLocalstorage } from './settings.js';
/**
 * To select which version of the game data to have
 */
/**@type {import('../../main/app/compactify').CompactGameData} */
export let gameData, compareData;


export function setupGameDataRetrieving(){
    window.api.receive('game-data', function(data){
        gameData = data
        console.log(gameData)
        hydrate()
    })
    window.api.receive('no-game-data', function(){
        window.api.send('ask-for-folder')
    })
    window.api.receive('ok-folder', function(){
        window.api.send('get-game-data')
    })
    //window.api.send('get-game-data')
    fetchFromJSONFile()
}

function fetchFromJSONFile(){
    fetch(`js/data/gameDataV1.6.1.json`)
    .then((response) => response.json())
    .then((data) => {
        console.log("took gamedata from server")
        console.warn('THIS MEANT NOT READY FOR PROD')
        gameData = data
        hydrate()
        try{
            saveToLocalstorage("data"+version, gameData)
            saveToLocalstorage("dataversion"+version, LATEST_DATA_VERSION)
        }catch(_e){
            // bruh
            console.log(gameData)
        }
})
}
