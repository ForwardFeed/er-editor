import { hydrate } from './hydrate.js'
import { saveToLocalstorage, fetchFromLocalstorage } from './settings.js';
/**
 * To select which version of the game data to have
 */
/**@type {import('./compactify.js').CompactGameData} */
export let gameData, compareData;


export function setupGameDataRetrieving(){

    window.api.receive('game-data', function(data){
        gameData = data
        hydrate()
    })
    window.api.receive('no-game-data', function(){
        window.api.send('ask-for-folder')
    })
    window.api.receive('ok-folder', function(){
        window.api.send('get-game-data')
    })
    window.api.send('get-game-data')
}

