
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { configuration } from './app/configuration';
import { platform } from 'os';
import { SpeciesList, SpeciesListSchema } from './gen/SpeciesList_pb.js'
import { fromBinary, Message, toBinary } from '@bufbuild/protobuf';
import { GenMessage } from '@bufbuild/protobuf/codegenv1';
import { MoveList, MoveListSchema } from './gen/MoveList_pb.js';
import { AbilityList, AbilityListSchema } from './gen/AbilityList_pb.js';
import { DescriptorProto, EnumDescriptorProto, FileDescriptorProto, FileDescriptorSetSchema } from '@bufbuild/protobuf/wkt';
import { MoveEnum, MoveEnumSchema } from './gen/MoveEnum_pb.js';
import type { GenEnum } from "@bufbuild/protobuf/codegenv1";
import { MoveBehavior, MoveBehaviorSchema } from './gen/MoveBehavior_pb.js';

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

function getUpdatedEnumMapping<T extends number>(projectRoot: String, enumSchema: GenEnum<T>): Map<T, string> {
  const actualRoot = projectRoot || configuration.project_root

  const protoName = enumSchema.file.name

  const command = `${protocLocation()}
    ${actualRoot}/proto/${protoName}.proto
    --proto_path=${actualRoot}/proto
    --java_out=${actualRoot}/tools/codegen/src
    --descriptor_set_out=${actualRoot}/tools/codegen/timestamp/depsets/${protoName}.proto
    --experimental_allow_proto3_optional`

  execSync(command)

  const enumName = enumSchema.typeName

  const descriptor = fromBinary(FileDescriptorSetSchema, readFileSync(`${actualRoot}/tools/codegen/timestamp/depsets/${protoName}.proto`))
  descriptor.file.filter(it => enumName.startsWith(it.package))

  function findEnumInMessage(message: DescriptorProto, path: string): EnumDescriptorProto | undefined {
    if (!path.startsWith(message.name + ".")) return
    const newPath = path.substring((message.name + ".").length)
    if (newPath.length <= 0) return
    for (const enumType of message.enumType) {
      if (enumType.name === newPath) return enumType
    }
    for (const messageType of message.nestedType) {
      const enumType = findEnumInMessage(messageType, newPath)
      if (enumType) return enumType
    }
    return
  }

  function findEnumInFile(file: FileDescriptorProto): EnumDescriptorProto | undefined {
    if (!enumName.startsWith(file.package + ".")) return
    const path = enumName.substring((file.package + ".").length)
    if (path.length <= 0) return
    for (const enumType of file.enumType) {
      if (enumType.name === path) return enumType
    }
    for (const messageType of file.messageType) {
      const enumType = findEnumInMessage(messageType, path)
      if (enumType) return enumType
    }
    return
  }

  const enumDesc = descriptor.file.reduce<EnumDescriptorProto | undefined>((acc, fileDesc) => acc || findEnumInFile(fileDesc), undefined)

  if (!enumDesc) throw `Could not find enum ${enumName} in proto ${protoName}`

  const values = enumDesc.value.map<[T, string]>(it => [it.number as T, it.name]);
  return new Map(values)
}

export function writeTextproto<T extends Message>(projectRoot: string, schema: GenMessage<T>, protoName: string, message: T) {
  const actualRoot = projectRoot || configuration.project_root

  const command = `${protocLocation()} \
    --decode=er.${protoName} \
    --proto_path=${actualRoot}/proto \
    --experimental_allow_proto3_optional \
    ${actualRoot}/proto/${protoName}.proto`

  const ret = execSync(command, { input: toBinary(schema, message) })
  writeFileSync(`${actualRoot}/proto/${protoName}.textproto`, `# proto-file: ${protoName}.proto\n# proto-message: er.${protoName}\n\n${ret}`)

}

export function readSpecies(ROOT_PRJ: string): SpeciesList {
  return readTextproto(ROOT_PRJ, SpeciesListSchema, "SpeciesList")
}

export function writeSpecies(ROOT_PRJ: string, speciesList: SpeciesList) {
  writeTextproto(ROOT_PRJ, SpeciesListSchema, "SpeciesList", speciesList)
}

export function readMoves(ROOT_PRJ: string): MoveList {
  return readTextproto(ROOT_PRJ, MoveListSchema, "MoveList")
}

export function writeMoves(ROOT_PRJ: string, movesList: MoveList) {
  writeTextproto(ROOT_PRJ, MoveListSchema, "MoveList", movesList)
}

export function getUpdatedMoveMapping(ROOT_PRJ: string): Map<MoveEnum, string> {
  return getUpdatedEnumMapping(ROOT_PRJ, MoveEnumSchema)
}

export function getUpdatedMoveEffectMapping(ROOT_PRJ: string): Map<MoveBehavior, string> {
  return getUpdatedEnumMapping(ROOT_PRJ, MoveBehaviorSchema)
}

export function readAbilities(ROOT_PRJ: string): AbilityList {
  return readTextproto(ROOT_PRJ, AbilityListSchema, "AbilitiesList")
}

export function writeAbilities(ROOT_PRJ: string, abilityList: AbilityList) {
  writeTextproto(ROOT_PRJ, AbilityListSchema, "AbilityList", abilityList)
}
