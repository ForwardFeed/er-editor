import { BattleSkillEnumSchema } from "../../gen/BattleSkillEnum_pb.js";
import { readBattleSkills } from "../../proto_compiler.js";
import { GameData } from "../main";

/** A predefined skill (implemented in battle_skills.cc) that a party can link. */
export interface BattleSkillEntry {
  NAME: string;
  name: string;
  announce: string;
}

// Every BattleSkillEnum value except SKILL_NONE, named from its BattleSkill entry
// or, for template implementations, from the template and its ability params.
export function getBattleSkills(ROOT_PRJ: string, gameData: GameData) {
  const list = readBattleSkills(ROOT_PRJ);
  const abilityName = (ability: number) => {
    const NAME = gameData.abilityEnumMap.get(ability) || "";
    return gameData.abilities.get(NAME)?.name || NAME;
  };

  gameData.battleSkills = BattleSkillEnumSchema.values
    .filter((value) => value.number !== 0)
    .map((value) => {
      const skill = list.skill.find((it) => it.id === value.number);
      if (skill)
        return {
          NAME: value.name,
          name: skill.name,
          announce: skill.announceString,
        };

      for (const template of list.template) {
        const impl = template.impl.find((it) => it.id === value.number);
        if (!impl) continue;
        const abilities = impl.param.map((it) =>
          it.param.case === "ability" ? abilityName(it.param.value) : "",
        );
        const announce = (
          template.validParams[abilities.length - 1]?.announceString || ""
        ).replace(/\{B_BUFF(\d)\}/g, (_, i) => abilities[+i - 1] || "");
        return {
          NAME: value.name,
          name: `${template.name}: ${abilities.join(", ")}`,
          announce,
        };
      }

      return { NAME: value.name, name: value.name, announce: "" };
    });
}
