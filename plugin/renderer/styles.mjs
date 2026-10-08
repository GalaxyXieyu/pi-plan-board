/**
 * Scoped by the host to this plugin's own mounts. Monochrome, on the host's
 * design tokens (fallbacks are the light-theme values), so the card reads like
 * the host's own tool rows rather than a widget dropped into the chat.
 */
const ink = "var(--ds-text-primary, #1a1c1f)";
const ink2 = "var(--ds-text-secondary, rgba(26,28,31,.7))";
const muted = "var(--ds-text-muted, rgba(26,28,31,.52))";
const faint = "var(--ds-text-faint, rgba(26,28,31,.38))";
const line = "var(--ds-border-default, rgba(26,28,31,.08))";
const lineSoft = "var(--ds-border-subtle, rgba(26,28,31,.05))";
const hover = "var(--ds-bg-hover, rgba(26,28,31,.06))";
const tile = "var(--ds-tile, rgba(26,28,31,.035))";
const accent = "var(--ds-accent, #1a1c1f)";
const ok = "var(--ds-success, #00a240)";
const bad = "var(--ds-error, #e02e2a)";

export const PLAN_BOARD_CSS = `
.pb-svg { flex: none; display: block; }
.pb-card { border: 1px solid ${line}; border-radius: 12px; background: var(--ds-raised, #fff); padding: 12px 14px 10px; margin: 6px 0; color: ${ink}; font-size: 13px; line-height: 1.5; display: flex; flex-direction: column; gap: 8px; max-width: 760px; }
.pb-card--error { border-color: color-mix(in srgb, ${bad} 35%, transparent); }
.pb-head { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.pb-brand { font-size: 12px; color: ${muted}; white-space: nowrap; }
.pb-title { font-size: 14px; font-weight: 600; flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pb-muted { color: ${muted}; }
.pb-error { color: ${bad}; }
.pb-notice { color: ${ink2}; background: ${tile}; border-radius: 8px; padding: 6px 10px; font-size: 12px; }
.pb-pill { font-size: 12px; color: ${ink2}; white-space: nowrap; }
.pb-pill::before { content: ""; display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 5px; vertical-align: 1px; background: ${faint}; }
.pb-pill--awaiting_approval::before { background: var(--ds-warning, #e25507); }
.pb-pill--approved::before, .pb-pill--executing::before { background: ${accent}; }
.pb-pill--completed::before { background: ${ok}; }
.pb-pill--superseded { color: ${faint}; }
.pb-save { font-size: 12px; color: ${faint}; white-space: nowrap; }
.pb-progress { display: flex; align-items: center; gap: 8px; font-size: 12px; color: ${muted}; font-variant-numeric: tabular-nums; }
.pb-progress-bar { flex: 1; height: 3px; border-radius: 2px; background: ${hover}; overflow: hidden; }
.pb-progress-bar span { display: block; height: 100%; background: ${accent}; transition: width .3s ease; }
.pb-card--completed .pb-progress-bar span { background: ${ok}; }
.pb-tabs { display: flex; gap: 14px; border-bottom: 1px solid ${lineSoft}; }
.pb-tab { border: 0; background: none; padding: 2px 0 6px; font: inherit; font-size: 12px; color: ${muted}; cursor: pointer; border-bottom: 1.5px solid transparent; margin-bottom: -1px; }
.pb-tab:hover { color: ${ink2}; }
.pb-tab--on { color: ${ink}; border-bottom-color: ${ink}; }

.pb-steps { display: flex; flex-direction: column; }
.pb-step { position: relative; display: flex; flex-direction: column; padding: 4px 6px; margin: 0 -6px; border-radius: 8px; }
.pb-step:hover, .pb-step:focus-within, .pb-step--open { background: ${tile}; }
.pb-step--in_progress { background: ${tile}; }
.pb-step-main { display: flex; align-items: center; gap: 8px; min-height: 26px; }
.pb-status { display: inline-flex; color: ${faint}; }
.pb-status--in_progress { color: ${ink}; }
.pb-status--completed { color: ${ok}; }
.pb-status--failed { color: ${bad}; }
.pb-step-index { width: 14px; flex: none; text-align: right; font-size: 12px; color: ${faint}; font-variant-numeric: tabular-nums; }
.pb-step-title, .pb-step-title-text { flex: 1 1 auto; min-width: 0; font: inherit; color: inherit; }
.pb-step-title { border: 1px solid transparent; background: transparent; border-radius: 6px; padding: 2px 6px; margin-left: -7px; }
.pb-step-title:hover { border-color: ${line}; }
.pb-step-title:focus { outline: none; border-color: var(--ds-border-strong, rgba(26,28,31,.14)); background: var(--ds-raised, #fff); }
.pb-step-title-text { padding: 2px 0; }
.pb-step--completed .pb-step-title-text { color: ${ink2}; }
.pb-step-tools { display: inline-flex; align-items: center; gap: 0; opacity: 0; transition: opacity .12s; }
.pb-step:hover .pb-step-tools, .pb-step:focus-within .pb-step-tools, .pb-step--open .pb-step-tools { opacity: 1; }
.pb-step-meta, .pb-note, .pb-detail-text, .pb-deps-panel, .pb-detail { margin-left: 22px; }
.pb-card--approved .pb-step-meta, .pb-card--executing .pb-step-meta, .pb-card--completed .pb-step-meta,
.pb-card--approved .pb-note, .pb-card--executing .pb-note, .pb-card--completed .pb-note,
.pb-card--approved .pb-detail-text, .pb-card--executing .pb-detail-text, .pb-card--completed .pb-detail-text { margin-left: 44px; }
.pb-step-meta { display: flex; margin-top: -2px; }
.pb-deps-line { font: inherit; font-size: 12px; color: ${faint}; background: none; border: 0; padding: 0 2px; margin-left: -2px; border-radius: 4px; text-align: left; }
button.pb-deps-line { cursor: pointer; }
button.pb-deps-line:hover, button.pb-deps-line[aria-expanded=true] { color: ${ink2}; background: ${hover}; }
.pb-text-btn { font: inherit; font-size: 12px; color: ${faint}; background: none; border: 0; padding: 2px 6px; border-radius: 5px; cursor: pointer; }
.pb-text-btn:hover, .pb-text-btn[aria-expanded=true] { color: ${ink2}; background: ${hover}; }
.pb-icon { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border: 0; background: none; cursor: pointer; padding: 0; border-radius: 6px; color: ${faint}; }
.pb-icon:hover:not(:disabled) { background: ${hover}; color: ${ink2}; }
.pb-icon:disabled { opacity: .35; cursor: default; }
.pb-deps-panel { display: flex; flex-direction: column; gap: 1px; margin-top: 4px; margin-bottom: 4px; padding: 4px; max-width: 460px; border: 1px solid ${line}; border-radius: 8px; background: var(--ds-raised, #fff); box-shadow: var(--ds-raised-shadow, 0 1px 2px rgba(0,0,0,.1)); }
.pb-deps-head { display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: ${muted}; padding: 0 2px 0 6px; }
.pb-deps-option { display: flex; align-items: center; gap: 8px; padding: 3px 6px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.pb-deps-option:hover:not(.is-disabled) { background: ${hover}; }
.pb-deps-option input { margin: 0; accent-color: ${accent}; }
.pb-deps-option.is-disabled { color: ${faint}; cursor: not-allowed; }
.pb-deps-num { width: 14px; text-align: right; color: ${faint}; font-variant-numeric: tabular-nums; }
.pb-deps-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pb-deps-hint { font-size: 11px; color: ${faint}; white-space: nowrap; }
.pb-input { font: inherit; color: inherit; background: var(--ds-raised, #fff); border: 1px solid ${line}; border-radius: 6px; padding: 3px 7px; }
.pb-input:focus { outline: none; border-color: var(--ds-border-strong, rgba(26,28,31,.14)); }
.pb-detail { box-sizing: border-box; width: calc(100% - 22px); resize: vertical; font-size: 12px; margin-top: 2px; margin-bottom: 4px; }
.pb-detail-text { white-space: pre-wrap; color: ${muted}; font-size: 12px; padding-bottom: 2px; }
.pb-note { font-size: 12px; color: ${muted}; padding-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pb-add { align-self: flex-start; display: inline-flex; align-items: center; gap: 4px; border: 0; background: none; border-radius: 6px; padding: 3px 6px; margin: 2px 0 0 -6px; cursor: pointer; color: ${muted}; font: inherit; font-size: 12px; }
.pb-add:hover { background: ${hover}; color: ${ink2}; }

.pb-design { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; }
.pb-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.pb-field--wide { grid-column: 1 / -1; }
.pb-field > label { font-size: 12px; color: ${muted}; }
.pb-select { font: inherit; font-size: 12px; border: 1px solid ${line}; border-radius: 6px; padding: 3px 4px; background: var(--ds-raised, #fff); color: inherit; max-width: 240px; }
.pb-keywords { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.pb-chip { display: inline-flex; align-items: center; gap: 2px; background: ${hover}; border-radius: 6px; padding: 1px 2px 1px 7px; font-size: 12px; white-space: nowrap; }
.pb-chip-x { display: inline-flex; border: 0; background: none; cursor: pointer; color: ${faint}; padding: 2px; border-radius: 4px; }
.pb-chip-x:hover { color: ${ink2}; background: ${hover}; }
.pb-inline { display: inline-flex; gap: 2px; align-items: center; }
.pb-keyword-input { width: 96px; font-size: 12px; padding: 1px 6px; }
.pb-font { display: flex; flex-direction: column; gap: 4px; }
.pb-font-level, .pb-color-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.pb-colors { display: flex; flex-direction: column; gap: 4px; }
.pb-font-name { width: 44px; font-size: 12px; color: ${muted}; }
.pb-font-preview { margin-left: 6px; line-height: 1.1; color: ${ink2}; }
.pb-swatch { display: inline-flex; align-items: center; gap: 3px; border: 1px solid ${line}; border-radius: 6px; padding: 1px 2px 1px 3px; }
.pb-swatch i { width: 12px; height: 12px; border-radius: 3px; display: inline-block; box-shadow: inset 0 0 0 1px rgba(0,0,0,.1); }
.pb-swatch input[type=color] { width: 16px; height: 16px; padding: 0; border: 0; background: none; cursor: pointer; }
.pb-swatch code { font-size: 11px; color: ${ink2}; }
.pb-hex { width: 66px; font-size: 11px; font-family: ui-monospace, monospace; border: 0; padding: 1px 2px; background: none; }
.pb-value { font-size: 13px; }
.pb-summary { max-height: 320px; overflow: auto; font-size: 13px; }
.pb-md h4, .pb-md h5, .pb-md h6 { margin: 6px 0 2px; font-size: 13px; }
.pb-md p { margin: 2px 0; }
.pb-md ul, .pb-md ol { margin: 2px 0; padding-left: 20px; }

.pb-actions { display: flex; align-items: flex-end; gap: 8px; border-top: 1px solid ${lineSoft}; padding-top: 8px; }
.pb-spacer { flex: 1; }
.pb-revise { display: flex; gap: 6px; align-items: flex-end; flex: 1; }
.pb-revise textarea { flex: 1; font-size: 12px; }
.pb-btn { font: inherit; font-size: 12px; border-radius: 8px; padding: 4px 12px; cursor: pointer; border: 1px solid ${line}; background: none; color: ${ink2}; }
.pb-btn:hover:not(:disabled) { background: ${hover}; }
.pb-btn--primary { background: ${accent}; border-color: ${accent}; color: var(--ds-raised, #fff); font-weight: 500; }
.pb-btn--primary:hover:not(:disabled) { background: var(--ds-accent-hover, #2c2f33); }
.pb-btn--primary:disabled { opacity: .45; cursor: default; }
.pb-btn--ghost { border-color: transparent; }

.pb-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: ${muted}; padding: 2px 0; min-width: 0; }
.pb-row-icon { display: inline-flex; color: ${faint}; }
.pb-row--completed .pb-row-icon { color: ${ok}; }
.pb-row--in_progress .pb-row-icon { color: ${ink2}; }
.pb-row--failed .pb-row-icon { color: ${bad}; }
.pb-row-main { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pb-row-title { color: ${ink2}; }
.pb-row-note { color: ${faint}; margin-left: 8px; }
.pb-snapshot { margin: 0; padding-left: 20px; }

.pb-toggle { display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 12px; border: 0; background: none; border-radius: 8px; padding: 4px 8px; cursor: pointer; color: ${ink2}; white-space: nowrap; }
.pb-toggle:hover { background: ${hover}; color: ${ink}; }
.pb-toggle--on { color: ${ink}; background: var(--ds-bg-active, rgba(26,28,31,.1)); }
`;
