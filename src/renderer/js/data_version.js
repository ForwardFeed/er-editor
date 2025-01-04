import { hydrate } from './hydrate.js'
import { saveToLocalstorage } from './settings.js';
import { bridge } from './context_bridge.js'
/**
 * To select which version of the game data to have
 */
/**@type {import('../../main/app/compactify').CompactGameData} */
export let gameData, compareData;

/**
 * The new version of the editor must valid that the proto compiler exist before doing anything
 */
export function setupProtoCompilerCheck(){
    bridge.receive('protoc-ok', function(version){
        console.log("proto-compiler-ok, version used: " + version)
    })
    bridge.receive('protoc-err', function(err){
        alert("error while checking the proto compiler: " + err)
    })
    bridge.send('check-protoc')
    setupGameDataRetrieving()
}

let rootPrj = ""
export function setupGameDataRetrieving(){
    bridge.receive('game-data', function(data){
        bridge.send('exec-protoc', rootPrj) // this is to execute the protoc
        gameData = data
        window.gameData = data
        try{
            hydrate()
        }
        catch(e){
            console.error('fail while hydrating', e)
        }
        
    })
    bridge.receive('no-game-data', function(){
        bridge.send('ask-for-folder')
    })
    bridge.receive('ok-folder', function(pRootPrj){
        // saving because i need to give it to the proto compiler after
        rootPrj = pRootPrj
        bridge.send('get-game-data')
    })
    
    bridge.send('get-game-data')
    //fetchFromJSONFile()
}

function fetchFromJSONFile(){
    fetch(`./js/data/gameDataV1.6.1.json`)
    .then((response) => response.json())
    .then((data) => {
        console.log("took gamedata from server")
        console.warn('THIS MEANT NOT READY FOR PROD')
        gameData = data
        window.gameData = data
        hydrate()
})
}