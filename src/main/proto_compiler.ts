
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { configuration } from './app/configuration';

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

export function executeProtoCompiler(PROOT_PRJ: string){
    const ROOT_PRJ = PROOT_PRJ || configuration.project_root
    // writing the command
    const command = `./protoc \
${ROOT_PRJ}/proto/SpeciesList.textproto \
--encode=er.SpeciesList \
--proto_path=${ROOT_PRJ}/proto \
--experimental_allow_proto3_optional \
< ${ROOT_PRJ}/proto/SpeciesList.textproto \
> ${ROOT_PRJ}/proto/SpeciesList.binpb`
    // running the command
    console.log(command)
}