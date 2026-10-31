// Small DOM controls shared by editors. They hold no state: each one reports
// edits through its callback and the caller owns the data.
import { e, JSHAC } from "../utils.js"

/** Bordered text button, styled like the trainer party tabs. */
export function button(label, onClick, className = "") {
  return e("div", `ctl-btn ${className}`, label, { onclick: onClick })
}

/** A label followed by its controls on one row; an empty label is omitted. */
export function labelled(label, ...controls) {
  return JSHAC([label ? e("span", "ctl-label", label) : undefined, ...controls], e("div", "ctl-row"))
}

/** `commit` reports the value once the user leaves the input instead of on every key. */
export function textInput(value, onInput, { multiline = false, commit = false, placeholder = "" } = {}) {
  const input = e(multiline ? "textarea" : "input", "ctl-input", value || "")
  if (!multiline) input.type = "text"
  input.placeholder = placeholder
  input[commit ? "onchange" : "oninput"] = () => onInput(input.value)
  return input
}

/** Integer input, clamped to [min, max] once the user leaves it. */
export function numberInput(value, onInput, { min, max } = {}) {
  const input = e("input", "ctl-input ctl-number")
  input.type = "number"
  if (min !== undefined) input.min = min
  if (max !== undefined) input.max = max
  input.value = value
  const clamp = (n) => Math.min(max ?? n, Math.max(min ?? n, n))
  input.oninput = () => {
    const n = parseInt(input.value)
    if (!isNaN(n) && n === clamp(n)) onInput(n)
  }
  input.onchange = () => {
    const n = clamp(parseInt(input.value) || 0)
    input.value = n
    onInput(n)
  }
  return input
}

export function checkbox(label, checked, onToggle) {
  const box = e("input")
  box.type = "checkbox"
  box.checked = checked
  box.onchange = () => onToggle(box.checked)
  return JSHAC([box, e("span", "", label)], e("label", "ctl-check"))
}

/**
 * @param {{value: string, label: string}[]} options
 * @param {string} placeholder if set, an extra first option with the value ""
 */
export function select(options, value, onChange, placeholder) {
  const node = e("select", "ctl-select")
  if (placeholder !== undefined) options = [{ value: "", label: placeholder }, ...options]
  for (const option of options) {
    const opt = e("option", "", option.label)
    opt.value = option.value
    node.append(opt)
  }
  node.value = value
  node.onchange = () => onChange(node.value)
  return node
}

/**
 * Text input with suggestions from a shared <datalist>, for option lists too long
 * for a select. Typing a label that matches no option restores the previous one.
 * @param {{value: string, label: string, hint?: string}[]} options labels must be
 *   unique; a hint is shown next to its label in the suggestions
 */
export function searchSelect(options, value, onChange, listId, placeholder = "") {
  if (!document.getElementById(listId)) {
    const list = e(`datalist#${listId}`)
    for (const option of options) {
      const node = e("option")
      node.value = option.label
      if (option.hint) node.label = option.hint
      list.append(node)
    }
    document.body.append(list)
  }
  const labelOf = (val) => options.find((it) => it.value === val)?.label || ""
  const input = e("input", "ctl-input ctl-search", labelOf(value))
  input.type = "text"
  input.setAttribute("list", listId)
  input.placeholder = placeholder
  input.onchange = () => {
    const option = options.find((it) => it.label === input.value)
    if (!option) {
      input.value = labelOf(value)
      return
    }
    value = option.value
    onChange(value)
  }
  return input
}

/**
 * Removable chips followed by an optional control that adds one.
 * @param {{label: string, onRemove: () => void}[]} chips
 */
export function chipList(chips, addControl) {
  const chipNodes = chips.map((chip) =>
    JSHAC(
      [e("span", "", chip.label), e("span", "ctl-remove", "x", { onclick: chip.onRemove })],
      e("div", "ctl-chip"),
    ),
  )
  return JSHAC([...chipNodes, addControl], e("div", "ctl-chips"))
}

let dragged // { items, index } of the row being dragged, across all sortable lists

/**
 * Edits an array in place: rows can be reordered with their "::" handle and
 * removed with "x"; onChange runs after either.
 */
export function sortableList(items, renderItem, onChange, className = "") {
  const list = e("div", `ctl-sortable ${className}`)
  items.forEach((item, index) => {
    const handle = e("div", "ctl-handle", "::")
    handle.draggable = true
    handle.ondragstart = (ev) => {
      dragged = { items, index }
      ev.dataTransfer.effectAllowed = "move"
      ev.dataTransfer.setDragImage(row, 0, 0)
    }
    const remove = e("div", "ctl-remove", "x", {
      onclick: () => {
        items.splice(index, 1)
        onChange()
      },
    })
    const row = JSHAC([handle, renderItem(item, index), remove], e("div", "ctl-sortable-row"))
    row.ondragover = (ev) => {
      if (dragged?.items !== items) return
      ev.preventDefault()
      ev.stopPropagation()
    }
    row.ondrop = (ev) => {
      if (dragged?.items !== items) return
      ev.preventDefault()
      ev.stopPropagation()
      items.splice(index, 0, ...items.splice(dragged.index, 1))
      dragged = undefined
      onChange()
    }
    list.append(row)
  })
  return list
}
