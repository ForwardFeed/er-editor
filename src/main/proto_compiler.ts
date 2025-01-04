
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { configuration } from './app/configuration';
import { platform } from 'os';

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

export function executeProtoCompiler(PROOT_PRJ: string) {
  const ROOT_PRJ = PROOT_PRJ || configuration.project_root

  // writing the command
  const command = `${protocLocation()} \
--encode=er.SpeciesList \
--proto_path=${ROOT_PRJ}/proto \
--experimental_allow_proto3_optional \
${platform() === 'win32' ? `${ROOT_PRJ}/proto/SpeciesList.proto` : "" } \
< ${ROOT_PRJ}/proto/SpeciesList.textproto \
> ${ROOT_PRJ}/proto/SpeciesList.binpb`
  // running the command
  console.log(command)
  const ret = execSync(command)
  console.log(ret.toJSON())
}
