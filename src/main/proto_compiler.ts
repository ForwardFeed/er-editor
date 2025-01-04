
import { execSync, exec } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { configuration } from './app/configuration';
import { platform } from 'os';
import { SpeciesList, SpeciesListSchema } from './gen/SpeciesList_pb.js'
import { fromBinary, toBinary } from '@bufbuild/protobuf';
import { Readable } from 'stream';

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

export function readTextproto(PROOT_PRJ: string): SpeciesList {
  const ROOT_PRJ = PROOT_PRJ || configuration.project_root

  const command = `${protocLocation()} \
    --encode=er.SpeciesList \
    --proto_path=${ROOT_PRJ}/proto \
    --experimental_allow_proto3_optional \
    ${ROOT_PRJ}/proto/SpeciesList.proto \
    < ${ROOT_PRJ}/proto/SpeciesList.textproto`

  console.log(command)
  const ret = execSync(command)
  return fromBinary(SpeciesListSchema, ret)
}

export function writeTextproto(PROOT_PRJ: string, speciesList: SpeciesList) {
  const ROOT_PRJ = PROOT_PRJ || configuration.project_root

  const command = `${protocLocation()} \
    --decode=er.SpeciesList \
    --proto_path=${ROOT_PRJ}/proto \
    --experimental_allow_proto3_optional \
    ${ROOT_PRJ}/proto/SpeciesList.proto`

  const ret = execSync(command, { input: toBinary(SpeciesListSchema, speciesList) })
  writeFileSync(`${ROOT_PRJ}/proto/SpeciesListSchema.textproto`, `# proto-file: Species.proto\n# proto-message: er.SpeciesList\n\n${ret}`)
}
