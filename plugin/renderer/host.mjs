/**
 * The renderer's own copy of the host `pi`, and the followed composer draft.
 * Components read the host through here because slot props carry data only.
 */
const MARK = "\uFFFC";
let pi = null;
let draft = null;
const draftListeners = new Set();

export function bindHost(api) {
  pi = api;
  pi.composer.subscribeDraft((snapshot) => {
    draft = snapshot;
    for (const listener of draftListeners) listener(snapshot);
  });
}

export function host() {
  return pi;
}

export function currentDraft() {
  return draft;
}

export function onDraft(listener) {
  draftListeners.add(listener);
  listener(draft);
  return () => draftListeners.delete(listener);
}

export function call(method, args) {
  return pi.dispatch("plugin.call", { method, args });
}

/** Whether the draft holds one of this plugin's marks whose send text matches. */
export function hasOwnMark(snapshot, test) {
  return Boolean(snapshot?.marks?.some((m) => m.kind === "plugin" && typeof m.send === "string" && test(m.send)));
}

/**
 * A `composer.replaceDraft` payload: every existing mark kept in place by
 * id except the ones `drop` matches, and `add` appended at the end.
 */
export function rewriteMarks(snapshot, { add, drop } = {}) {
  let at = 0;
  const marks = [];
  const text = snapshot.text.replace(new RegExp(MARK, "g"), () => {
    const mark = snapshot.marks[at++];
    if (drop && mark.kind === "plugin" && typeof mark.send === "string" && drop(mark.send)) return "";
    marks.push({ id: mark.id });
    return MARK;
  });
  const base = add ? text.replace(/\s+$/, "") : text;
  return {
    expectedGeneration: snapshot.generation,
    text: add ? (base ? `${base} ${MARK}` : MARK) : base,
    marks: add ? [...marks, add] : marks,
  };
}

/**
 * Replace the draft. Must run synchronously inside a user's click: the host
 * refuses a rewrite started anywhere else (PLUGIN_DRAFT_REMOTE).
 */
export function replaceDraftNow(payloadFor) {
  if (!draft) return Promise.reject(Object.assign(new Error("没有可用的输入框"), { code: "PLUGIN_ACTION_NO_COMPOSER" }));
  return pi.dispatch("composer.replaceDraft", payloadFor(draft));
}
