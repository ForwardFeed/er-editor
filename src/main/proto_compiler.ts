import { execSync } from "child_process";
import {
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { configuration } from "./app/configuration";
import { platform } from "os";
import { SpeciesList, SpeciesListSchema } from "./gen/SpeciesList_pb.js";
import { create, fromBinary, Message, toBinary } from "@bufbuild/protobuf";
import { GenMessage } from "@bufbuild/protobuf/codegenv1";
import { MoveList, MoveListSchema } from "./gen/MoveList_pb.js";
import { AbilityList, AbilityListSchema } from "./gen/AbilityList_pb.js";
import {
  DescriptorProto,
  EnumDescriptorProto,
  FileDescriptorProto,
  FileDescriptorSetSchema,
} from "@bufbuild/protobuf/wkt";
import { MoveEnum, MoveEnumSchema } from "./gen/MoveEnum_pb.js";
import type { GenEnum } from "@bufbuild/protobuf/codegenv1";
import { MoveBehavior, MoveBehaviorSchema } from "./gen/MoveBehavior_pb.js";
import { AbilityEnum, AbilityEnumSchema } from "./gen/AbilityEnum_pb.js";
import { SpeciesEnum, SpeciesEnumSchema } from "./gen/SpeciesEnum_pb.js";
import { ItemEnum, ItemEnumSchema } from "./gen/ItemEnum_pb.js";
import { ItemList, ItemListSchema } from "./gen/ItemList_pb.js";
import {
  TrainerClass,
  TrainerClassSchema,
  TrainerList,
  TrainerListSchema,
  TrainerMusic,
  TrainerMusicSchema,
  TrainerPic,
  TrainerPicSchema,
} from "./gen/TrainerList_pb.js";
import { TrainerEnum, TrainerEnumSchema } from "./gen/TrainerEnum_pb.js";
import { inspect } from "util";

function protocLocation() {
  switch (platform()) {
    case "linux":
      return "./protoc-linux";
    case "win32":
      return "protoc.exe";
    case "darwin":
      return "./protoc-osx";
    default:
      console.error(`No proto compiler available for platform ${platform()}`);
      throw "No proto compiler available for platform";
  }
}

export function checkProtoExistence() {
  if (!existsSync(protocLocation())) {
    console.error(`missing the proto compiler: ${protocLocation()}`);
    throw "missing the proto compiler";
  }
}

export function canRunProto(): string {
  const exec = execSync(`${protocLocation()} --version`);
  const versionBeingUsed = exec.toString();
  console.log("proto-compiler-ok, version used: " + versionBeingUsed);
  return versionBeingUsed;
}

export function readTextproto<T extends Message>(
  projectRoot: string,
  schema: GenMessage<T>,
  textprotoPath?: string,
): T {
  const actualRoot = projectRoot || configuration.project_root;

  const protoName = schema.name;
  const textprotoName = textprotoPath || `${protoName}.textproto`;

  const command = `${protocLocation()} \
    --encode=er.${protoName} \
    --proto_path=${actualRoot}/proto \
    --experimental_allow_proto3_optional \
    ${actualRoot}/proto/${protoName}.proto \
    < ${actualRoot}/proto/${textprotoName}`;

  console.log(command);
  const ret = execSync(command);

  return fromBinary(schema, ret);
}

function getUpdatedEnumMapping<T extends number>(
  projectRoot: String,
  enumSchema: GenEnum<T>,
): Map<T, string> {
  const actualRoot = projectRoot || configuration.project_root;

  const protoName = enumSchema.file.name;

  if (!existsSync(`${actualRoot}/tools/codegen/src/er/proto`))
    mkdirSync(`${actualRoot}/tools/codegen/src/er/proto`, { recursive: true });

  if (!existsSync(`${actualRoot}/tools/codegen/timestamp/depsets`))
    mkdirSync(`${actualRoot}/tools/codegen/timestamp/depsets`, {
      recursive: true,
    });

  const command = `${protocLocation()} \
    ${actualRoot}/proto/${protoName}.proto \
    --proto_path=${actualRoot}/proto \
    --java_out=${actualRoot}/tools/codegen/src \
    --descriptor_set_out=${actualRoot}/tools/codegen/timestamp/depsets/${protoName}.proto \
    --experimental_allow_proto3_optional`;

  console.log(command);

  execSync(command);

  const enumName = enumSchema.typeName;

  const descriptor = fromBinary(
    FileDescriptorSetSchema,
    readFileSync(
      `${actualRoot}/tools/codegen/timestamp/depsets/${protoName}.proto`,
    ),
  );
  descriptor.file.filter((it) => enumName.startsWith(it.package));

  function findEnumInMessage(
    message: DescriptorProto,
    path: string,
  ): EnumDescriptorProto | undefined {
    if (!path.startsWith(message.name + ".")) return;
    const newPath = path.substring((message.name + ".").length);
    if (newPath.length <= 0) return;
    for (const enumType of message.enumType) {
      if (enumType.name === newPath) return enumType;
    }
    for (const messageType of message.nestedType) {
      const enumType = findEnumInMessage(messageType, newPath);
      if (enumType) return enumType;
    }
    return;
  }

  function findEnumInFile(
    file: FileDescriptorProto,
  ): EnumDescriptorProto | undefined {
    if (!enumName.startsWith(file.package + ".")) return;
    const path = enumName.substring((file.package + ".").length);
    if (path.length <= 0) return;
    for (const enumType of file.enumType) {
      if (enumType.name === path) return enumType;
    }
    for (const messageType of file.messageType) {
      const enumType = findEnumInMessage(messageType, path);
      if (enumType) return enumType;
    }
    return;
  }

  const enumDesc = descriptor.file.reduce<EnumDescriptorProto | undefined>(
    (acc, fileDesc) => acc || findEnumInFile(fileDesc),
    undefined,
  );

  if (!enumDesc) throw `Could not find enum ${enumName} in proto ${protoName}`;

  const values = enumDesc.value.map<[T, string]>((it) => [
    it.number as T,
    it.name,
  ]);
  return new Map(values);
}

export function writeTextproto<T extends Message>(
  projectRoot: string,
  schema: GenMessage<T>,
  message: T,
) {
  const actualRoot = projectRoot || configuration.project_root;

  const protoName = schema.name;

  const command = `${protocLocation()} \
    --decode=er.${protoName} \
    --proto_path=${actualRoot}/proto \
    --experimental_allow_proto3_optional \
    ${actualRoot}/proto/${protoName}.proto`;

  const filepath = `${actualRoot}/proto/${protoName}.textproto`;

  writeFileSync(
    filepath,
    `# proto-file: ${protoName}.proto\n# proto-message: er.${protoName}\n\n`,
  );

  execSync(command, {
    input: toBinary(schema, message),
    stdio: [undefined, openSync(filepath, "a")],
  });
}

export function readSpecies(ROOT_PRJ: string): SpeciesList {
  return readTextproto(ROOT_PRJ, SpeciesListSchema);
}

export function writeSpecies(ROOT_PRJ: string, speciesList: SpeciesList) {
  writeTextproto(ROOT_PRJ, SpeciesListSchema, speciesList);
}

export function readMoves(ROOT_PRJ: string): MoveList {
  return readTextproto(ROOT_PRJ, MoveListSchema);
}

export function writeMoves(ROOT_PRJ: string, movesList: MoveList) {
  writeTextproto(ROOT_PRJ, MoveListSchema, movesList);
}

export function getUpdatedMoveMapping(ROOT_PRJ: string): Map<MoveEnum, string> {
  return getUpdatedEnumMapping(ROOT_PRJ, MoveEnumSchema);
}

export function getUpdatedMoveEffectMapping(
  ROOT_PRJ: string,
): Map<MoveBehavior, string> {
  return getUpdatedEnumMapping(ROOT_PRJ, MoveBehaviorSchema);
}

export function getUpdatedAbilityMapping(
  ROOT_PRJ: string,
): Map<AbilityEnum, string> {
  return getUpdatedEnumMapping(ROOT_PRJ, AbilityEnumSchema);
}

export function getUpdatedSpeciesMapping(
  ROOT_PRJ: string,
): Map<SpeciesEnum, string> {
  return getUpdatedEnumMapping(ROOT_PRJ, SpeciesEnumSchema);
}

export function getUpdatedItemMapping(ROOT_PRJ: string): Map<ItemEnum, string> {
  return getUpdatedEnumMapping(ROOT_PRJ, ItemEnumSchema);
}

export function readAbilities(ROOT_PRJ: string): AbilityList {
  return readTextproto(ROOT_PRJ, AbilityListSchema);
}

export function writeAbilities(ROOT_PRJ: string, abilityList: AbilityList) {
  writeTextproto(ROOT_PRJ, AbilityListSchema, abilityList);
}

export function readItems(ROOT_PRJ: string): ItemList {
  const items = create(ItemListSchema);
  for (const file of readdirSync(`${ROOT_PRJ}/proto/items/`)) {
    if (!file.endsWith(".textproto")) continue;
    items.item.push(
      ...readTextproto(ROOT_PRJ, ItemListSchema, `items/${file}`).item,
    );
  }
  return items;
}

export function readTrainers(ROOT_PRJ: string): TrainerList {
  return readTextproto(ROOT_PRJ, TrainerListSchema);
}

export function writeTrainers(ROOT_PRJ: string, trainerList: TrainerList) {
  writeTextproto(ROOT_PRJ, TrainerListSchema, trainerList);
}

export function getUpdatedTrainerMapping(
  ROOT_PRJ: string,
): Map<TrainerEnum, string> {
  return getUpdatedEnumMapping(ROOT_PRJ, TrainerEnumSchema);
}

export function getUpdatedTrainerClassMapping(
  ROOT_PRJ: string,
): Map<TrainerClass, string> {
  return getUpdatedEnumMapping(ROOT_PRJ, TrainerClassSchema);
}

export function getUpdatedTrainerMusicMapping(
  ROOT_PRJ: string,
): Map<TrainerMusic, string> {
  return getUpdatedEnumMapping(ROOT_PRJ, TrainerMusicSchema);
}

export function getUpdatedTrainerPicMapping(
  ROOT_PRJ: string,
): Map<TrainerPic, string> {
  return getUpdatedEnumMapping(ROOT_PRJ, TrainerPicSchema);
}

export function writeTrainerEnums(
  ROOT_PRJ: string,
  trainerEnums: Map<TrainerEnum, string>,
) {
  const filepath = `${ROOT_PRJ}/proto/TrainerEnum.proto`;
  const strings: string[] = [];
  for (const [value, name] of trainerEnums.entries()) {
    strings.push(`  ${name} = ${value};`);
  }
  writeFileSync(
    filepath,
    `syntax = "proto3";

package er;

option java_package = "er.proto";
option java_multiple_files = true;

enum TrainerEnum {
${strings.join("\n")}
}`,
  );
}
