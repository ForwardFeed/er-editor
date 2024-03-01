/**
 * @typedef
 * @param {JQuery} target 
 * @param {JQuery} newTarget 
 * @param {('text2val'|'val2text')} method 
 * @returns 
 */
export function s(target, newTarget, method){
    target.replaceWith(newTarget)
    if (method === "text2val"){
        newTarget.val(target.text())
    }
    if (method === "val2text"){
        newTarget.text(target.val())
    }
    return newTarget
}