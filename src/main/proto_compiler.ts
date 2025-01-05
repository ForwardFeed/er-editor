
import { execSync, exec } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { configuration } from './app/configuration';
import { platform } from 'os';
import { SpeciesList, SpeciesListSchema } from './gen/SpeciesList_pb.js'
import { fromBinary, Message, toBinary } from '@bufbuild/protobuf';
import { GenMessage } from '@bufbuild/protobuf/codegenv1';
import { MoveList, MoveListSchema } from './gen/MoveList_pb.js';

function protocLocation() {
  switch (platform()) {
    case 'linux': return "./protoc-linux"
    case 'win32': return "protoc.exe"
    case 'darwin': return "./protoc-osx"
    default:
      console.error(`No proto compiler available for platform ${platform()}`)
      throw "No proto compiler available for platform"
  }
}

export function checkProtoExistence() {
  if (!existsSync(protocLocation())) {
    console.error(`missing the proto compiler: ${protocLocation()}`)
    throw "missing the proto compiler"
  }
}

export function canRunProto(): string {
  const exec = execSync(`${protocLocation()} --version`)
  const versionBeingUsed = exec.toString()
  console.log("proto-compiler-ok, version used: " + versionBeingUsed)
  return versionBeingUsed
}

export function readTextproto<T extends Message>(projectRoot: string, schema: GenMessage<T>, protoName: string): T {
  const actualRoot = projectRoot || configuration.project_root

  const command = `${protocLocation()} \
    --encode=er.${protoName} \
    --proto_path=${actualRoot}/proto \
    --experimental_allow_proto3_optional \
    ${actualRoot}/proto/${protoName}.proto \
    < ${actualRoot}/proto/${protoName}.textproto`

  console.log(command)
  const ret = execSync(command)
  return fromBinary(schema, ret)
}

export function writeTextproto<T extends Message>(projectRoot: string, schema: GenMessage<T>, protoName: string, message: T) {
  const actualRoot = projectRoot || configuration.project_root

  const command = `${protocLocation()} \
    --decode=er.${protoName} \
    --proto_path=${actualRoot}/proto \
    --experimental_allow_proto3_optional \
    ${actualRoot}/proto/${protoName}.proto`

  const ret = execSync(command, { input: toBinary(schema, message) })
  writeFileSync(`${actualRoot}/proto/${schema}.textproto`, `# proto-file: ${protoName}.proto\n# proto-message: er.${protoName}\n\n${ret}`)

}

export function readSpecies(ROOT_PRJ: string): SpeciesList {
  return readTextproto(ROOT_PRJ, SpeciesListSchema, "SpeciesList")
}

export function writeSpecies(ROOT_PRJ: string, speciesList: SpeciesList) {
  writeTextproto(ROOT_PRJ, SpeciesListSchema, "SpeciesList", speciesList)
}

export function readMoves(ROOT_PRJ: string): MoveList {
  return readTextproto(ROOT_PRJ, MoveListSchema, "MovesList")
}

export function writeMoves(ROOT_PRJ: string, movesList: MoveList) {
  writeTextproto(ROOT_PRJ, MoveListSchema, "MovesList", movesList)
}
