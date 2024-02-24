const themesList =  [
    "blueish",
    "rushed",
    "wood",
    "blahaj",
]

// init as default settings
export const settings = {
    theme: "blueish",
}

export function initAppSettings(){
    //Fetch with main process
}

export function saveSettings(){
    //TODO save it with main process
}

export function saveToLocalstorage(key, value){
    console.trace('disable this')
}

export function fetchFromLocalstorage(key){
    console.trace('disable this')
}

function changeTheme(){
    let settingsTheme = settings.theme
    if (themesList.indexOf(settingsTheme) == -1) settingsTheme = themesList[0]
    for (const theme of themesList){
        document.getElementById(`styles-${theme}`).disabled = theme !== settingsTheme
    }
    
}

export function setupSettings(){
    $('#settings-btn').on('click', function(){
        $('#settings-frame').toggle()
    })
    const toUpperCaseFirst = (word)=>{
        return word.charAt(0).toUpperCase() + word.slice(1)
    }
    const name = "theme"
    const Name = toUpperCaseFirst(name)
    const frag = document.createDocumentFragment()
    const themeCore = document.createElement('div')
    themeCore.className = "settings-row"
    const themeSpan = document.createElement('span')
    themeSpan.innerText = Name + ":"
    frag.append(themeSpan)
    for (const theme of themesList){
        const themeLabel = document.createElement('label')
        themeLabel.htmlFor = `${name}-${theme}`
        themeLabel.innerText = toUpperCaseFirst(theme)
        const themeInput = document.createElement('input')
        themeInput.type = "radio"
        themeInput.name = name
        themeInput.id = `${name}-${theme}`
        if (settings[name] === theme) themeInput.checked = true
        themeInput.onchange = () => {
            settings.theme = theme
            saveSettings()
            changeTheme()
        }
        frag.append(themeLabel)
        frag.append(themeInput)
    }
    themeCore.append(frag)
    $('#settings-frame').append(themeCore)
}