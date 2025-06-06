import * as FS from 'fs'
import * as Path from 'path'

type Macro = string | boolean
type MacroMap = Map<string, Macro>

export type FileData = {
    data: string,
    macros: MacroMap,
}

export type FileDataOptions = {
    macros: MacroMap,
    filterComments: boolean,
    filterMacros: boolean,
}

const defaultMacroMap = () => {return new Map([["TRUE", true]])}

const defaultFileDataOptions = {
    macros: defaultMacroMap(),
    filterComments: false,
    filterMacros: false,
}

/**
 * read a file and return throught a promise its content (see FileData interface)
 * @param fullpath the absolute path of the file to get data
 * @param options FileDataOptions to applicate to the file reading
 * @returns a promise of FileData or an error
 */

export function getFileData(fullpath: string, 
                            options: FileDataOptions = defaultFileDataOptions): 
                            Promise<FileData> {

    return new Promise(function(resolve: (fileData: FileData)=> void, rejected: (reason: string)=> void){
        FS.access(fullpath, (err_exist)=>{
            if (err_exist){
                const err = `file: ${fullpath} has not been found`
                return rejected(err)
            } else{
                FS.readFile(fullpath, 'utf8', (err_exist, data: string) => {
                    if (err_exist){
                        const err = `couldn't read filefile: ${fullpath}, reason: ${err_exist}`
                        return rejected(err)
                    }
                    if (options.filterComments){
                        data = filterComments(data)
                    }
                    if (options.filterMacros){
                        return resolve(filterMacros(data, options.macros))
                    }
                    return resolve({data: data, macros: defaultMacroMap()})
                })
            }    
        });
    });
}

/**
 * get multiple files data
 * @param fullFilePathList an array of absolute path to files
 * @param options FileDataOptions that will be applied to the reading of all files
 * @returns the promise of a concatenated result of all the data of all files, (the order isn't tested yet) 
 * or may be an error if any file didn't got read as planed
 * if a filepath starts with "#" the macros aren't preprocessed.
 */

export function getMulFilesData(fullFilePathList: string[],
                                options: FileDataOptions = defaultFileDataOptions)
                                : Promise<string> {
    
    const promiseArray: Promise<FileData>[] = []
    for (const filepath of fullFilePathList){
        // some files must no read macros because they hinder the code.
        if (filepath[0] == "#"){
            const cloneOption = structuredClone(options)
            cloneOption.filterMacros = false
            promiseArray.push(getFileData(filepath.replace('#', ''), cloneOption))
        } else {
            promiseArray.push(getFileData(filepath, options))
        }
        
    }

    let cumulativeText = ""
    return new Promise((resolve, reject)=>{
        Promise.all(promiseArray)
            .then((values) => {
                for (const val of values){
                    cumulativeText += val.data
                }
                resolve(cumulativeText)
            })
            .catch((error: string) => {
                reject(error)
            });
    })
    
}

/**
 * Trim out all commented part of a C file
 * @param {string} data 
 * @returns string without comments
 */

export function filterComments(data: string): string{
    return data .replace(/\/\/[^\r\n]*/g, '')
                .replace(/\/\*[^*]*\*\//g, '')
}


/**
 * Filter data in accordance to how C preprocessing macros works
 * @param {string} data file content filtered
 * @param {MacroMap} macros an array of C preprocessing macros 
 * @returns {FileData} a FileData (custom type)
 */
export function filterMacros(data: string, macros: MacroMap = defaultMacroMap()): FileData{
    let isIncluded = true
    let hasBeenIncluded = false
    let filteredData = ""
    data = data.replace(/\\\n/g, '')
    const lines = data.split("\n");
    for (let line of lines){
        if (line.includes("#define"))
        {
            line = line.replace(/.*#define/, '').trim() //
            let macro = ""
            // does not work well for complex. But well out of my scope
            if (line.match(/^\w+/)){
                macro = line.match(/^\w+/)?.[0] || ""
            }
            const value = line.replace(macro, '').trim() || true
            if (macro && value){
                macros.set(macro, value)
            }
            isIncluded = true
            continue

        } else if (line.includes('#ifdef'))
        {
            const flag = line.match(/(?<=#ifdef )\w+/)
            if (flag) isIncluded = macros.has(flag[0])
            continue

        } else if (line.includes('#ifndef'))
        {
            const flag = line.match(/(?<=#ifndef )\w+/)
            if (flag) {
                isIncluded = !macros.has(flag[0])
            }
            
            continue

        } else if (line.includes('#if') || line.includes('#elif'))
        {
            if (hasBeenIncluded) {
                isIncluded = false
                continue
            }
            // ideally it would be great to support more
            // complex expressions
            line = line.replace(/[()]/g, '')
            const expr = line.match(/((?<=#if )|(?<=#elif )).*/)
            if (!expr) {
                isIncluded = false
                continue
            }
            const exprTable = expr[0].split(' ')
            if (exprTable.length == 1){
                isIncluded =  macros.has(exprTable[0])

            } else if (exprTable.length == 2){
                console.warn('macro filter failed to interpret : ', exprTable)
                isIncluded = false

            } else if (exprTable.length == 3){
                const first = macros.get(exprTable[0]) || exprTable[0]
                const second = macros.get(exprTable[2]) || exprTable[2]

                if (!first || !second) {
                    isIncluded = false
                    continue
                }
                const operator = exprTable[1]
                switch(operator){
                    case "==":
                        isIncluded = (first == second)
                        break;
                    case "!=":
                        isIncluded = (first != second)
                        break;
                    case "<":
                        isIncluded = (+first < +second)
                        break;
                    case "<=":
                        isIncluded = (+first <= +second)
                        break;
                    case ">":
                        isIncluded = (+first > +second)
                        break;
                    case ">=":
                        isIncluded = (+first >= +second)
                        break;
                    case "&&":
                        isIncluded = (first && second) ? true : false
                        break;
                    case "||":
                        isIncluded = (first || second) ? true : false
                        break;
                    default:
                        console.warn('macro filter unknown operator :  "' + operator + '"')
                        isIncluded = false
                }
                hasBeenIncluded = isIncluded
            } else {
                console.warn('macro filter failed to interpret : "' + exprTable.join(' ') + '"')
                isIncluded = false
            }
            continue 
        }
        else if (line.includes('#else'))
        {
            isIncluded = hasBeenIncluded ? false : !isIncluded
            continue
        }
        else if (line.includes('#endif'))
        {
            isIncluded = true
            hasBeenIncluded = false
            continue
        }
        if (isIncluded) filteredData += line + '\n' //maybe i should put the cringe \cr\lf here
    }
    return {data: filteredData, macros: fullyResolveMacro(macros)}
}

function fullyResolveMacro(macros: MacroMap): MacroMap{
    for (const [key, value] of macros){
        if (typeof value !== "string") continue
        // if it's a number it means that it's a raw value, so don't modify it
        if (!isNaN(+value)) continue
        // if it's really not a pure value but a reference to another value, lets look for it
        if (macros.has(value)) {
            //has value as a key, we can substitute
            macros.set(key, macros.get(value) || "") 
            continue
        }
        const values = value.split(' ')
        if (values.length === 3){
            const resolveEach = values.map((x)=>{
                if (macros.has(x)){
                    return macros.get(x) + ""
                }
                return x
            })
            const operator = resolveEach[1]
            if (!operator) continue
            if (operator === "+"){
                const val1 = resolveEach[0]
                const val2 = resolveEach[2]
                if (!val1 || !val2) continue
                macros.set(key, (+val1 + +val2)+"") 
            } else {
                //console.warn(`fullyResolveMacro: unknown operator : ${operator}`)
            }

        }
    }
    return macros
}

/**
 * check if all files are accessible
 * @param fullFilePathList an array of absolute path to files
 * @returns a promise of a true statement (always true if resolved)
 * or throw a rejection with the list of files not found
 * 
 */
export function checkFiles(fullFilePathList: string[]): Promise<boolean> {
    const promiseArray: Array<Promise<boolean>> = []
    for (const fullFilepath of fullFilePathList){
        promiseArray.push(new Promise(function(resolve, reject){
            FS.access(fullFilepath, (err_exist) => {
                if (err_exist){
                    return reject(fullFilepath)
                }
                resolve(true)
            })
        }));
    }

    return new Promise((resolve, rejected) => {
        Promise.allSettled(promiseArray)
        .then((results: PromiseSettledResult<boolean>[]) => {
            let isRejected = false
            const rejectedList: string[] = []
            for (const i in results){
                const result = results[i]
                if (result.status === "rejected") {
                    isRejected = true
                    rejectedList.push(fullFilePathList[i])
                }
            }
            if (isRejected) {
                return rejected(rejectedList)
            }
            return resolve(true)
        })
        .catch(() => {
            return rejected()
        })
    }) 
}
/**
 * from a folder path "root" (ideally absolute), merge/join a list of relative files 
 * @param directory base folder to be considered
 * @param files array of relative path of files
 * @returns an array of absolute path of files, or at least absolute to the folder path
 */
export function autojoinFilePath(directory: string, files: string[]): string[] {
    return files.map(filepath => {
        if (filepath[0] === "#"){
            return "#" + Path.join(directory, filepath.replace('#', ''))
        }
        return Path.join(directory, filepath)
    })
}
