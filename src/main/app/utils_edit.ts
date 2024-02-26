import * as FS from 'fs'

export function getRawFile(fullpath: string): 
    Promise<string> {

    return new Promise(function(resolve: (fileData: string)=> void, rejected: (reason: string)=> void){
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
                    return resolve(data)
                })
            }    
        });
    });
}

export function writeRawFile(fullpath: string, data: string): 
    Promise<undefined> {

    return new Promise(function(resolve, rejected: (reason: string)=> void){
        FS.writeFile(fullpath, data, 'utf8', (err_exist) => {
            if (err_exist){
                const err = `couldn't write file: ${fullpath}, reason: ${err_exist}`
                return rejected(err)
            }
            return resolve(undefined)
        })
    });
}