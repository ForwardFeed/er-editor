import { DescField, DescMessage, ScalarType } from "@bufbuild/protobuf";

// A plain-JSON view of proto descriptors, sent to the renderer so it can build
// editors for messages in their proto JSON form (see toJson/fromJson) without
// importing generated code. Field names are JSON names, enum values are names.

export type FormFieldType = "string" | "bool" | "int" | "enum" | "message";

export interface FormField {
  name: string;
  type: FormFieldType;
  // Enum or message type name, for "enum" and "message" fields.
  ref?: string;
  repeated: boolean;
}

export interface FormOneof {
  oneof: string;
  fields: FormField[];
}

export type FormMember = FormField | FormOneof;

export interface FormSchema {
  messages: Record<string, FormMember[]>;
  enums: Record<string, string[]>;
}

const INT_TYPES = [
  ScalarType.INT32,
  ScalarType.UINT32,
  ScalarType.SINT32,
  ScalarType.FIXED32,
  ScalarType.SFIXED32,
];

function scalarType(scalar: ScalarType, where: string): FormFieldType {
  if (scalar === ScalarType.STRING) return "string";
  if (scalar === ScalarType.BOOL) return "bool";
  if (INT_TYPES.includes(scalar)) return "int";
  throw new Error(
    `${where}: scalar type ${ScalarType[scalar]} is not supported`,
  );
}

/** Describes `root` and every message and enum reachable from it. */
export function describeForm(root: DescMessage): FormSchema {
  const schema: FormSchema = { messages: {}, enums: {} };

  function field(desc: DescField): FormField {
    const where = `${desc.parent.typeName}.${desc.name}`;
    const repeated = desc.fieldKind === "list";
    const kind = desc.fieldKind === "list" ? desc.listKind : desc.fieldKind;
    switch (kind) {
      case "scalar":
        return {
          name: desc.jsonName,
          type: scalarType(desc.scalar!, where),
          repeated,
        };
      case "enum": {
        const enumDesc = desc.enum!;
        schema.enums[enumDesc.typeName] ??= enumDesc.values.map(
          (it) => it.name,
        );
        return {
          name: desc.jsonName,
          type: "enum",
          ref: enumDesc.typeName,
          repeated,
        };
      }
      case "message":
        visit(desc.message!);
        return {
          name: desc.jsonName,
          type: "message",
          ref: desc.message!.typeName,
          repeated,
        };
      default:
        throw new Error(`${where}: ${kind} fields are not supported`);
    }
  }

  function visit(message: DescMessage) {
    if (schema.messages[message.typeName]) return;
    const members: FormMember[] = [];
    // Registered before walking members so recursive messages terminate.
    schema.messages[message.typeName] = members;
    for (const member of message.members) {
      members.push(
        member.kind === "oneof"
          ? { oneof: member.localName, fields: member.fields.map(field) }
          : field(member),
      );
    }
  }

  visit(root);
  return schema;
}
