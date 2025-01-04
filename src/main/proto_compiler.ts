
import { execSync } from 'child_process';
import { existsSync } from 'fs';

const PROTO_COMPILER_PATH = "./protoc-linux"

export function checkProtoExistence(){
    if (!existsSync(PROTO_COMPILER_PATH)){
        console.error(`missing the proto compiler: ${PROTO_COMPILER_PATH}`)
        throw "missing the proto compiler"
    }
}

export function canRunProto(): string{
    const exec = execSync(`${PROTO_COMPILER_PATH} --version`)
    const versionBeingUsed = exec.toString()
    console.log("proto-compiler-ok, version used: " + versionBeingUsed)
    return versionBeingUsed
}