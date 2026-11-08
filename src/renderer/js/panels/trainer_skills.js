// The Skills view of a trainer's hell party: inline skills (er.InlineSkill, edited
// through ProtoForm) and links to predefined skills (er.BattleSkillEnum).
import { gameData } from "../data_version.js"
import { bridge } from "../context_bridge.js"
import { e, JSHAC } from "../utils.js"
import { ProtoForm } from "../components/proto_form.js"
import { button, labelled, searchSelect } from "../components/controls.js"

const INLINE_SKILL = "er.InlineSkill"

const S = INLINE_SKILL
const turns = { min: 1, max: 255 }
const percent = { min: 0, max: 99 }
const hints = {
  [`${S}.announceString`]: { label: "Announce", multiline: true },
  [`${S}.extraAbility`]: { label: "Extra abilities (max 3)", maxItems: 3, addLabel: "+ ability" },
  [`${S}.extraItem`]: { label: "Extra held items (max 2)", maxItems: 2, addLabel: "+ item" },
  [`${S}.on`]: { label: "", numbered: true, addLabel: "+ rule" },
  [`${S}.ExtraItem.item`]: { label: "" },
  [`${S}.ExtraItem.strength`]: { label: "Strength", min: 0, max: 255 },

  // a rule: "when <event> [on whose side, conditions] do <effects>"
  [S + ".Trigger"]: { order: ["kind", "side", "once", "chance", "hpBelow", "effect"] },
  [`${S}.Trigger.kind`]: { label: "When", required: true },
  [`${S}.Trigger.entry`]: { label: "Pokémon enters" },
  [`${S}.Trigger.endTurn`]: { label: "End of turn" },
  [`${S}.Trigger.battleStart`]: { label: "Battle starts" },
  [`${S}.Trigger.hit`]: { label: "Hit by a move" },
  [`${S}.Trigger.faint`]: { label: "Faints" },
  [`${S}.Trigger.statChange`]: { label: "Stat changes" },
  [`${S}.Trigger.switchOut`]: { label: "Switches out" },
  [`${S}.Trigger.side`]: { label: "Whose" },
  [`${S}.Trigger.once`]: { label: "" },
  [`${S}.Trigger.chance`]: { label: "Chance %", ...percent },
  [`${S}.Trigger.hpBelow`]: { label: "HP below %", ...percent },
  [`${S}.Trigger.effect`]: { label: "Do", addLabel: "+ effect" },
  [`${S}.Entry.when`]: { label: "" },
  [`${S}.Entry.slots`]: { label: "", addLabel: "+ party slots" },
  [`${S}.EndTurn.every`]: { label: "Every N turns", min: 0, max: 255 },
  [`${S}.EndTurn.onField`]: { label: "Count turns on field" },
  [`${S}.Hit.move`]: { label: "", addLabel: "+ move filter" },
  [`${S}.Hit.effectiveness`]: { addLabel: "+ effectiveness" },
  [`${S}.MoveFilter.type`]: { addLabel: "+ type" },
  [`${S}.MoveFilter.split`]: { addLabel: "+ split" },
  [`${S}.MoveFilter.flag`]: { addLabel: "+ flag" },
  [`${S}.StatChanged.stat`]: { label: "", addLabel: "+ stat" },
  [`${S}.StatChanged.direction`]: { label: "" },
  [`${S}.PartySlots.first`]: { min: 0, max: 6 },
  [`${S}.PartySlots.last`]: { min: 0, max: 6 },

  [`${S}.Effect.kind`]: { label: "", required: true },
  [`${S}.Effect.statChange`]: { label: "Change stats" },
  [`${S}.Effect.terrain`]: { label: "Set terrain" },
  [`${S}.Effect.weather`]: { label: "Set weather" },
  [`${S}.Effect.sideCondition`]: { label: "Set side condition" },
  [`${S}.Effect.useMove`]: { label: "Use move" },
  [`${S}.Effect.field`]: { label: "Set field status" },
  [`${S}.Effect.status`]: { label: "Apply status" },
  [`${S}.Target.slots`]: { label: "", addLabel: "+ party slots" },
  [`${S}.StatChange.stat`]: { label: "", addLabel: "+ stat" },
  [`${S}.StatChange.amount`]: { label: "by", min: -6, max: 6 },
  [`${S}.StatChange.target`]: { label: "", addLabel: "+ target" },
  [`${S}.SetTerrain.terrain`]: { label: "" },
  [`${S}.SetTerrain.duration`]: { label: "" },
  [`${S}.SetTerrain.turns`]: turns,
  [`${S}.SetWeather.weather`]: { label: "" },
  [`${S}.SetWeather.duration`]: { label: "" },
  [`${S}.SetWeather.turns`]: turns,
  [`${S}.SetSideCondition.type`]: { label: "", addLabel: "+ condition" },
  [`${S}.SetSideCondition.who`]: { label: "Side of" },
  [`${S}.SetSideCondition.layers`]: { label: "Layers (hazards)", min: 0, max: 3 },
  [`${S}.SetSideCondition.duration`]: { label: "" },
  [`${S}.SetSideCondition.turns`]: turns,
  [`${S}.SetFieldStatus.type`]: { label: "", addLabel: "+ field status" },
  [`${S}.SetFieldStatus.duration`]: { label: "" },
  [`${S}.SetFieldStatus.turns`]: turns,
  [`${S}.ApplyStatus.status`]: { label: "" },
  [`${S}.ApplyStatus.target`]: { label: "", addLabel: "+ target" },
  [`${S}.UseMove.move`]: { label: "" },
  [`${S}.UseMove.power`]: { min: 0, max: 255 },
}

// Values the proto marks as "not allowed" or that do nothing
const hiddenValues = {
  [`${S}.Hit.Effectiveness`]: ["EFFECTIVENESS_UNSET"],
  [`${S}.MoveFilter.Flag`]: ["FLAG_UNSET"],
  [`${S}.SetSideCondition.ConditionType`]: ["NONE"],
  [`${S}.SetFieldStatus.FieldType`]: ["NONE"],
  [`${S}.ApplyStatus.Status`]: ["NONE"],
  "er.ItemEnum": ["ITEM_NONE"],
}

const statLabels = {
  STAT_HP: "HP", STAT_ATK: "Atk", STAT_DEF: "Def", STAT_SPEED: "Spe", STAT_SPATK: "SpA",
  STAT_SPDEF: "SpD", STAT_ACC: "Acc", STAT_EVASION: "Eva", STAT_HIGHEST_ATTACKING: "Best attack",
  STAT_HIGHEST_DEFENDING: "Best defense", STAT_HIGHEST_TOTAL: "Best stat",
}
const enumLabelTables = {
  "er.Stat": statLabels,
  [`${S}.Entry.When`]: { EVERY: "every Pokémon", LEAD: "lead only", LAST: "last Pokémon" },
  [`${S}.Side`]: { TRAINER: "trainer's Pokémon", PLAYER: "player's Pokémon", BOTH: "any Pokémon" },
  [`${S}.Once`]: {
    ALWAYS: "every time", PER_SWITCH_IN: "once per switch-in", PER_POKEMON: "once per Pokémon",
    PER_BATTLE: "once per battle",
  },
  [`${S}.Target.Scope`]: { MON: "Pokémon", FIELD: "its side of the field", PARTY: "whole party" },
}

const EYE_ICON = `<svg viewBox="0 0 16 10" width="1.3em" height="0.8em">
  <path d="M1 5 Q8 -3 15 5 Q8 13 1 5Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <circle cx="8" cy="5" r="2" fill="currentColor"/></svg>`

let form
const view = { trainer: undefined, container: undefined, onCountChange: undefined, selected: 0, preview: false }

function getForm() {
  if (!form) {
    const names = (list) => new Map(list.map((it) => [it.NAME, it.name]))
    const tables = {
      ...enumLabelTables,
      "er.AbilityEnum": names(gameData.abilities),
      "er.MoveEnum": names(gameData.moves),
      "er.ItemEnum": names(gameData.items),
    }
    const enumLabels = Object.fromEntries(Object.entries(tables).map(([type, table]) =>
      [type, (value) => (table instanceof Map ? table.get(value) : table[value])]))
    form = new ProtoForm(gameData.skillSchema, {
      hints,
      enumLabels,
      hiddenValues,
      onChange: changed,
    })
  }
  return form
}

export function skillCount(trainer) {
  const skills = trainer.hellSkills
  return skills ? skills.skill.length + skills.inlineSkill.length : 0
}

/** Renders the hell skills of `trainer` into `container`, replacing its content. */
export function renderTrainerSkills(trainer, container, onCountChange) {
  if (view.trainer !== trainer) {
    view.selected = 0
    view.preview = false
  }
  Object.assign(view, { trainer, container, onCountChange })
  trainer.hellSkills ??= { skill: [], inlineSkill: [] }
  render()
}

/** Inline skills first, then linked ones, matching their order in the party. */
function entries() {
  const { skill, inlineSkill } = view.trainer.hellSkills
  return [
    ...inlineSkill.map((value, index) => ({ inline: true, value, index })),
    ...skill.map((value, index) => ({ inline: false, value, index })),
  ]
}

/** Skill names, numbered where they repeat ("Sticky Web (2)"), hinted with the enum name. */
function linkedOptions() {
  const seen = new Map()
  return gameData.battleSkills.map((it) => {
    const n = (seen.get(it.name) || 0) + 1
    seen.set(it.name, n)
    return { value: it.NAME, label: n > 1 ? `${it.name} (${n})` : it.name, hint: it.NAME }
  })
}

function linkedSkill(NAME) {
  return gameData.battleSkills.find((it) => it.NAME === NAME)
}

function entryLabel(entry) {
  if (entry.inline) return entry.value.name || "(unnamed)"
  return `${linkedSkill(entry.value)?.name || entry.value} (linked)`
}

function changed(structural) {
  view.trainer.skillsDirty = true
  if (structural) return render()
  // keep focus in the edited input: refresh only what depends on the text
  const tabs = view.container.querySelectorAll(".skills-tab")
  entries().forEach((entry, i) => tabs[i] && (tabs[i].innerText = entryLabel(entry)))
  view.container.querySelector(".skills-save").classList.remove("hidden")
  renderPreview()
}

function render() {
  const list = entries()
  view.selected = Math.min(view.selected, list.length - 1)
  const entry = list[view.selected]
  const skills = view.trainer.hellSkills

  const tabs = list.map((it, i) =>
    button(entryLabel(it), () => {
      view.selected = i
      render()
    }, `skills-tab ${i === view.selected ? "sel-active" : "sel-n-active"}`),
  )
  const addInline = button("+ new", () => {
    skills.inlineSkill.push({ ...getForm().newMessage(INLINE_SKILL), name: "New skill" })
    view.selected = skills.inlineSkill.length - 1
    changed(true)
  }, "sel-n-active")
  const addLinked = button("link existing", () => {
    skills.skill.push(gameData.battleSkills[0].NAME)
    view.selected = list.length
    changed(true)
  }, "sel-n-active")
  const remove = entry && button("remove skill", () => {
    (entry.inline ? skills.inlineSkill : skills.skill).splice(entry.index, 1)
    changed(true)
  }, "skills-remove")

  const save = button("save !", saveSkills, `skills-save ${view.trainer.skillsDirty ? "" : "hidden"}`)
  const columns = entry
    ? [renderSkillColumn(entry), renderRulesColumn(entry)]
    : [e("div", "skills-empty", "No skills yet: create one or link an existing skill.")]

  view.container.replaceChildren(JSHAC([
    e("div", "skills-view"), [
      JSHAC([...tabs, addInline, addLinked, remove], e("div", "skills-tabs")),
      JSHAC(columns, e("div", "skills-columns")),
      JSHAC([e("div", "skills-error"), save], e("div", "skills-footer")),
    ],
  ]))
  renderPreview()
  view.onCountChange?.()
}

function renderSkillColumn(entry) {
  const column = e("div", "skills-column skills-identity")
  column.append(e("div", "skills-title", "Skill"))
  const eye = button("", () => {
    view.preview = !view.preview
    eye.classList.toggle("sel-active", view.preview)
    renderPreview()
  }, `skills-eye ${view.preview ? "sel-active" : ""}`)
  eye.innerHTML = EYE_ICON
  eye.title = "Preview the battle message"

  if (entry.inline) {
    const skill = entry.value
    const form = getForm()
    column.append(
      labelled("Name", form.renderField(INLINE_SKILL, "name", skill)),
      labelled("Announce", eye),
      form.renderField(INLINE_SKILL, "announceString", skill),
      e("div", "skills-preview"),
      labelled(form.label(INLINE_SKILL, "extraAbility")),
      form.renderField(INLINE_SKILL, "extraAbility", skill),
      labelled(form.label(INLINE_SKILL, "extraItem")),
      form.renderField(INLINE_SKILL, "extraItem", skill),
    )
  } else {
    const skills = view.trainer.hellSkills.skill
    column.append(
      labelled("Skill", searchSelect(linkedOptions(), entry.value, (NAME) => {
        skills[entry.index] = NAME
        changed(true)
      }, "skills-linked-list")),
      e("div", "skills-note", entry.value),
      labelled("Announce", eye),
      e("div", "skills-announce", linkedSkill(entry.value)?.announce || "(no announce)"),
      e("div", "skills-preview"),
    )
  }
  return column
}

function renderRulesColumn(entry) {
  const column = e("div", "skills-column skills-rules")
  column.append(e("div", "skills-title", "Rules - when X, do Y"))
  column.append(entry.inline
    ? getForm().render(INLINE_SKILL, entry.value, ["on"])
    : e("div", "skills-note", "Predefined skill: its rules are implemented in the game code (battle_skills.cc)."))
  return column
}

function announceText() {
  const entry = entries()[view.selected]
  if (!entry) return ""
  return entry.inline ? entry.value.announceString || "" : linkedSkill(entry.value)?.announce || ""
}

/** A plain stand-in for the battle text box: one box per \p, a line per \n or \l. */
function renderPreview() {
  const node = view.container.querySelector(".skills-preview")
  if (!node) return
  node.classList.toggle("hidden", !view.preview)
  if (!view.preview) return
  const text = announceText()
    .replace(/\{B_TRAINER1_NAME\}/g, view.trainer.name)
    .replace(/\{B_PLAYER_NAME\}/g, "Player")
  node.replaceChildren(...text.split("\\p").map((page) =>
    JSHAC(page.split(/\\[nl]/).map((line) => e("div", "skills-textbox-line", line)), e("div", "skills-textbox")),
  ))
}

function saveSkills() {
  const trainer = view.trainer
  const error = view.container.querySelector(".skills-error")
  error.innerText = ""
  bridge.invoke("set-hell-skills", trainer.NAME, trainer.hellSkills)
    .then(() => {
      trainer.skillsDirty = false
      if (view.trainer === trainer) render()
    })
    .catch((err) => {
      error.innerText = String(err.message || err).replace(/^.*?Error: /, "")
    })
}
