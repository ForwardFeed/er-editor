// Editors for proto messages in their JSON form (what toJson produces and fromJson
// accepts), built from the FormSchema made by src/main/proto_schema.ts. Any message
// the schema describes gets an editor; hints only adjust labels, limits and layout.
//
// Rendering never changes the data: an absent field shows its default, an absent
// optional message shows an add button, and edits write to the object in place.
import { e, JSHAC } from "../utils.js"
import {
  button, checkbox, chipList, labelled, numberInput, searchSelect, select, sortableList, textInput,
} from "./controls.js"

/**
 * Per field or oneof, keyed by "<message type>.<json field name | oneof name>":
 * @typedef {{
 *   label?: string,     // "" hides the label
 *   addLabel?: string,  // text of the add button of a repeated or optional message field
 *   min?: number, max?: number,
 *   maxItems?: number,
 *   multiline?: boolean,
 *   numbered?: boolean, // number the items of a repeated message
 *   required?: boolean, // a oneof that must have a case: new messages get the first one
 * }} Hint
 * Per message, keyed by "<message type>":
 * @typedef {{ order?: string[] }} MessageHint members listed first, in this order
 */

const SEARCH_THRESHOLD = 50 // enums with more values use a search input

/** "statChange" -> "Stat change" */
function humanize(name) {
  const words = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Strips the prefix every value shares: WEATHER_SUN_PRIMAL -> "Sun primal". */
function enumValueLabels(values) {
  let prefix = values.length > 1 ? values[0].replace(/[^_]*$/, "") : ""
  while (prefix && !values.every((it) => it.startsWith(prefix))) {
    prefix = prefix.slice(0, -1).replace(/[^_]*$/, "")
  }
  return values.map((it) => humanize(it.slice(prefix.length).replace(/_/g, " ").toLowerCase()))
}

const memberName = (member) => member.oneof || member.name

export class ProtoForm {
  /**
   * @param {import('../../../main/proto_schema').FormSchema} schema
   * @param {{
   *   hints?: Record<string, Hint | MessageHint>,
   *   enumLabels?: Record<string, (value: string) => string | undefined>,
   *   hiddenValues?: Record<string, string[]>, enum values that are never valid choices
   *   onChange: (structural: boolean) => void,
   * }} options onChange gets true when the edit changed which controls exist
   */
  constructor(schema, { hints = {}, enumLabels = {}, hiddenValues = {}, onChange }) {
    this.schema = schema
    this.hints = hints
    this.enumLabels = enumLabels
    this.hiddenValues = hiddenValues
    this.onChange = onChange
    this.options = new Map()
  }

  hint(typeName, name) {
    return this.hints[`${typeName}.${name}`] || {}
  }

  label(typeName, name) {
    return this.hint(typeName, name).label ?? humanize(name)
  }

  /** @returns {{value: string, label: string}[]} with unique labels */
  enumOptions(enumType) {
    if (!this.options.has(enumType)) {
      const values = this.schema.enums[enumType]
      const custom = this.enumLabels[enumType] || (() => undefined)
      const hidden = this.hiddenValues[enumType] || []
      const fallback = enumValueLabels(values)
      const seen = new Set()
      const options = []
      values.forEach((value, i) => {
        if (hidden.includes(value)) return
        let label = custom(value) || fallback[i]
        if (seen.has(label)) label = `${label} (${value})`
        seen.add(label)
        options.push({ value, label })
      })
      this.options.set(enumType, options)
    }
    return this.options.get(enumType)
  }

  /** A new message with each required oneof set to its first case. */
  newMessage(typeName) {
    const obj = {}
    for (const member of this.schema.messages[typeName]) {
      if (member.oneof && this.hint(typeName, member.oneof).required) {
        obj[member.fields[0].name] = this.newValue(typeName, member.fields[0], true)
      }
    }
    return obj
  }

  newValue(typeName, field, inOneof = false) {
    switch (field.type) {
      case "message": return this.newMessage(field.ref)
      case "enum": return this.schema.enums[field.ref][0]
      case "int": {
        const { min = -Infinity, max = Infinity } = this.hint(typeName, field.name)
        return Math.min(Math.max(0, min), max) // 0 when allowed, else the closest bound
      }
      case "string": return ""
      // a bool oneof case is only meaningful when set
      case "bool": return inOneof
    }
  }

  /** Controls for the given members of `obj` (all of them by default). */
  render(typeName, obj, names) {
    const order = this.hints[typeName]?.order || []
    const rank = (member) => {
      const i = order.indexOf(memberName(member))
      return i === -1 ? order.length : i
    }
    const members = this.schema.messages[typeName]
      .filter((it) => !names || names.includes(memberName(it)))
      .sort((a, b) => rank(a) - rank(b)) // stable: unlisted members keep proto order
    return JSHAC(members.map((member) => this.renderMember(typeName, member, obj)), e("div", "pf-message"))
  }

  /** A member with its label. Members that hold other messages get a line of their own. */
  renderMember(typeName, member, obj) {
    const control = member.oneof
      ? this.renderOneof(typeName, member, obj)
      : this.renderField(typeName, member, obj)
    const row = member.type === "bool"
      ? control // checkboxes carry their own label
      : labelled(this.label(typeName, memberName(member)), control)
    const holdsMessage = member.oneof
      ? member.fields.some((it) => it.type === "message" && it.name in obj)
      : member.type === "message" && (member.repeated || member.name in obj)
    if (holdsMessage) row.classList.add("pf-block")
    return row
  }

  /** The control for one field of `obj`, without its label. */
  renderField(typeName, field, obj, inOneof = false) {
    if (typeof field === "string") field = this.schema.messages[typeName].find((it) => it.name === field)
    const hint = this.hint(typeName, field.name)
    const set = (value) => {
      obj[field.name] = value
      this.onChange(false)
    }
    if (field.repeated) {
      const attach = () => (obj[field.name] ??= [])
      return field.type === "message"
        ? this.renderMessageList(typeName, field, obj[field.name] || [], attach)
        : this.renderChips(typeName, field, obj[field.name] || [], attach)
    }
    if (field.type === "message") {
      if (inOneof) return this.render(field.ref, obj[field.name])
      return this.renderOptionalMessage(typeName, field, obj)
    }
    const value = obj[field.name] ?? this.newValue(typeName, field)
    switch (field.type) {
      case "string": return textInput(value, set, hint)
      case "int": return numberInput(value, set, hint)
      case "bool": return checkbox(this.label(typeName, field.name), value, set)
      case "enum": return this.renderEnum(field.ref, value, set)
    }
  }

  /** A message field has presence: absent until added, removable once set. */
  renderOptionalMessage(typeName, field, obj) {
    if (!(field.name in obj)) {
      const label = this.hint(typeName, field.name).addLabel || `+ ${this.label(typeName, field.name).toLowerCase()}`
      return button(label, () => {
        obj[field.name] = this.newMessage(field.ref)
        this.onChange(true)
      }, "pf-add")
    }
    const remove = e("div", "ctl-remove", "x", {
      onclick: () => {
        delete obj[field.name]
        this.onChange(true)
      },
    })
    return JSHAC([this.render(field.ref, obj[field.name]), remove], e("div", "pf-optional"))
  }

  /** A value that isn't a valid choice (a hidden default) shows as the placeholder. */
  renderEnum(enumType, value, onChange, placeholder) {
    const options = this.enumOptions(enumType)
    if (!options.some((it) => it.value === value)) placeholder ??= "-"
    return options.length > SEARCH_THRESHOLD
      ? searchSelect(options, value, onChange, `pf-enum-${enumType}`, placeholder)
      : select(options, value, onChange, placeholder)
  }

  /** A select of the cases, followed by the editor of the chosen case. */
  renderOneof(typeName, oneof, obj) {
    const current = oneof.fields.find((it) => it.name in obj)
    const { required } = this.hint(typeName, oneof.oneof)
    const options = oneof.fields.map((it) => ({ value: it.name, label: this.label(typeName, it.name) }))
    const choose = select(options, current?.name || "", (name) => {
      for (const it of oneof.fields) delete obj[it.name]
      const field = oneof.fields.find((it) => it.name === name)
      if (field) obj[name] = this.newValue(typeName, field, true)
      this.onChange(true)
    }, required && current ? undefined : "-")
    // a bool case has no value left to edit once chosen
    const body = current && current.type !== "bool" ? this.renderField(typeName, current, obj, true) : undefined
    return JSHAC([choose, body], e("div", "pf-oneof"))
  }

  renderChips(typeName, field, values, attach) {
    const { maxItems = Infinity, addLabel } = this.hint(typeName, field.name)
    const labelOf = (value) => field.type === "enum"
      ? this.enumOptions(field.ref).find((it) => it.value === value)?.label || value
      : String(value)
    const chips = values.map((value, i) => ({
      label: labelOf(value),
      onRemove: () => {
        values.splice(i, 1)
        this.onChange(true)
      },
    }))
    const placeholder = addLabel || "+ add"
    const push = (value) => {
      if (value === "") return
      attach().push(field.type === "int" ? parseInt(value) || 0 : value)
      this.onChange(true)
    }
    const add = values.length >= maxItems ? undefined
      : field.type === "enum" ? this.renderEnum(field.ref, "", push, placeholder)
      : textInput("", push, { commit: true, placeholder })
    return chipList(chips, add)
  }

  renderMessageList(typeName, field, items, attach) {
    const { addLabel, numbered, maxItems = Infinity } = this.hint(typeName, field.name)
    const list = sortableList(
      items,
      (item, i) => {
        const body = this.render(field.ref, item)
        if (numbered) body.prepend(e("div", "pf-index", `${i + 1}.`))
        return body
      },
      () => this.onChange(true),
      `pf-list-${field.ref.split(".").pop()}`,
    )
    const add = items.length < maxItems && button(addLabel || `+ ${this.label(typeName, field.name).toLowerCase()}`, () => {
      attach().push(this.newMessage(field.ref))
      this.onChange(true)
    }, "pf-add")
    return JSHAC([list, add || undefined], e("div", "pf-repeated"))
  }
}
