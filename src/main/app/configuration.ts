import { dialog } from 'electron'
import {readFileSync, writeFileSync, existsSync, stat} from 'fs'
import { join } from 'path'

export interface Configuration{
    project_root: string
    verified: boolean
}
const CONFIG_PATH = "./user_settings.json"


const defaultConfiguration: Configuration = {
    project_root: "",
    verified: false,
}

export let configuration: Configuration = defaultConfiguration

function saveConfigFile(){
    writeFileSync(CONFIG_PATH, JSON.stringify(configuration))
}

export function getConfiguration(): boolean {
    if (!existsSync(CONFIG_PATH)) {
        saveConfigFile()
        return false
    }
    try{
        configuration = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
        return true
    } catch(e){
        console.error(`Couldn't read or parse configuration file ${CONFIG_PATH}`)
        return false
    }
    
}

function checkIfPathExist(path: string): Promise<void>{
    return new Promise((resolved, rejected)=>{
        stat(path, (err: NodeJS.ErrnoException | null)=>{
            if (err){
                rejected(path)
            } else {
                resolved()
            }
        })
    })
}


function verifyFolders(): Promise<void>{
    const foldersToCheck: string[] = [
        "include",
        "include/constants",
        "src",
        "src/data",
        "src/data/pokemon"
    ]
    return new Promise((resolved, rejected)=>{
        Promise.allSettled(foldersToCheck.map((folder)=>{
            const path = join(configuration.project_root, folder)
            return checkIfPathExist(path)
        })).then((values)=>{
            let isGood = true
            for (const value of values){
                if (value.status === "rejected"){
                    console.error(`could not find path ${value.reason}`)
                    isGood = false
                }
            }
            return isGood ? resolved() : rejected() 
        })
    })
}

export function verifyConfiguration(): Promise<void>{
    return new Promise((resolved, rejected)=>{
        verifyFolders()
            .then(()=>{
                //check the files
                saveConfigFile()
                resolved()
            })
            .catch(()=>{
                rejected()
            })
    })
    
}

export function askForFolder(window: Electron.BrowserWindow){
    dialog.showOpenDialog(window, { title: "Please select a valid Elite Redux gamefile root folder", properties: ['openDirectory']})
    .then((dir)=>{
        if (dir.filePaths.length) {
            configuration.project_root = dir.filePaths[0]
            saveConfigFile()
            window.webContents.send('ok-folder', configuration.project_root)
        } else {
            console.error('no folder chosen')
        }
        
    })
    .catch((err)=>{
        console.error('error while trying to open folder dialog', err)
    })
}