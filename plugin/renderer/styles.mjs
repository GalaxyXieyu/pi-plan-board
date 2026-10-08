/** Scoped by the host to this plugin's own mounts; host design tokens with fallbacks. */
export const PLAN_BOARD_CSS = `
.pb-card { border: 1px solid var(--ds-border-default, #e3e3e3); border-radius: 12px; background: var(--ds-bg-elevated, #fff); padding: 12px 14px; margin: 6px 0; color: var(--ds-text-primary, #1f1f1f); font-size: 13px; line-height: 1.5; display: flex; flex-direction: column; gap: 10px; max-width: 760px; }
.pb-card--error { border-color: var(--ds-error, #d33); }
.pb-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pb-brand { font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--ds-accent, #6d4aff); }
.pb-title { font-size: 14px; flex: 1 1 auto; min-width: 0; }
.pb-muted { color: var(--ds-text-muted, #8a8a8a); }
.pb-error { color: var(--ds-error, #d33); }
.pb-notice { color: var(--ds-text-secondary, #555); background: var(--ds-bg-chip, #f4f2ff); border-radius: 8px; padding: 6px 10px; }
.pb-pill { font-size: 11px; padding: 1px 8px; border-radius: 999px; background: var(--ds-bg-chip, #f1f1f1); color: var(--ds-text-secondary, #555); white-space: nowrap; }
.pb-pill--awaiting_approval { background: #fff4d6; color: #8a5a00; }
.pb-pill--approved, .pb-pill--executing { background: #e7efff; color: #2756c5; }
.pb-pill--completed { background: #e3f6e8; color: #1e7a3a; }
.pb-pill--superseded { background: #eee; color: #888; text-decoration: line-through; }
.pb-save { font-size: 11px; }
.pb-progress { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--ds-text-secondary, #555); }
.pb-progress-bar { flex: 1; height: 6px; border-radius: 3px; background: var(--ds-bg-hover, #eee); overflow: hidden; }
.pb-progress-bar span { display: block; height: 100%; background: var(--ds-success, #2e9b4f); transition: width .3s ease; }
.pb-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--ds-border-subtle, #eee); }
.pb-tab { border: 0; background: none; padding: 4px 10px 6px; font: inherit; color: var(--ds-text-secondary, #666); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.pb-tab--on { color: var(--ds-text-primary, #1f1f1f); border-bottom-color: var(--ds-accent, #6d4aff); font-weight: 600; }
.pb-steps { display: flex; flex-direction: column; gap: 6px; }
.pb-step { border: 1px solid var(--ds-border-subtle, #eee); border-radius: 8px; padding: 6px 8px; display: flex; flex-direction: column; gap: 4px; }
.pb-step--in_progress { border-color: #8fb0ff; background: #f5f8ff; }
.pb-step--completed { border-color: #bfe5c9; background: #f6fcf7; }
.pb-step--failed { border-color: #f2b8b8; }
.pb-step-main { display: flex; align-items: center; gap: 6px; }
.pb-step-index { min-width: 22px; color: var(--ds-text-muted, #888); font-variant-numeric: tabular-nums; white-space: nowrap; }
.pb-step--completed .pb-step-index { color: #1e7a3a; }
.pb-step--in_progress .pb-step-index { color: #2756c5; }
.pb-step-title, .pb-step-title-text { flex: 1 1 auto; min-width: 0; }
.pb-id { font-size: 11px; color: var(--ds-text-muted, #999); }
.pb-input { font: inherit; color: inherit; background: var(--ds-bg-elevated, #fff); border: 1px solid var(--ds-border-default, #ddd); border-radius: 6px; padding: 3px 7px; }
.pb-input:focus { outline: 2px solid color-mix(in srgb, var(--ds-accent, #6d4aff) 35%, transparent); border-color: var(--ds-accent, #6d4aff); }
.pb-detail { width: 100%; box-sizing: border-box; resize: vertical; }
.pb-detail-text { white-space: pre-wrap; color: var(--ds-text-secondary, #555); padding-left: 28px; }
.pb-note { padding-left: 28px; font-size: 12px; }
.pb-deps { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; padding-left: 28px; font-size: 12px; }
.pb-chip { display: inline-flex; align-items: center; gap: 2px; background: var(--ds-bg-chip, #f1effa); border-radius: 999px; padding: 0 4px 0 8px; font-size: 12px; max-width: 260px; }
.pb-chip-x { border: 0; background: none; cursor: pointer; color: var(--ds-text-muted, #888); padding: 0 4px; font-size: 13px; }
.pb-select { font: inherit; font-size: 12px; border: 1px solid var(--ds-border-default, #ddd); border-radius: 6px; padding: 2px 4px; background: var(--ds-bg-elevated, #fff); color: inherit; max-width: 240px; }
.pb-icon { border: 0; background: none; cursor: pointer; padding: 2px 5px; border-radius: 5px; color: var(--ds-text-secondary, #666); font: inherit; }
.pb-icon:hover:not(:disabled) { background: var(--ds-bg-hover, #f0f0f0); }
.pb-icon:disabled { opacity: .35; cursor: default; }
.pb-add { align-self: flex-start; border: 1px dashed var(--ds-border-default, #ccc); background: none; border-radius: 8px; padding: 3px 10px; cursor: pointer; color: var(--ds-text-secondary, #666); font: inherit; }
.pb-design { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
.pb-field { display: flex; flex-direction: column; gap: 4px; }
.pb-field--wide { grid-column: 1 / -1; }
.pb-field > label { font-size: 11px; font-weight: 600; color: var(--ds-text-muted, #888); }
.pb-keywords, .pb-colors { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.pb-colors { flex-direction: column; align-items: stretch; }
.pb-inline { display: inline-flex; gap: 2px; }
.pb-keyword-input { width: 110px; font-size: 12px; }
.pb-font { display: flex; flex-direction: column; gap: 4px; }
.pb-font-level, .pb-color-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.pb-font-name { width: 48px; font-size: 12px; color: var(--ds-text-secondary, #666); }
.pb-font-preview { margin-left: 6px; line-height: 1.1; }
.pb-swatch { display: inline-flex; align-items: center; gap: 3px; border: 1px solid var(--ds-border-subtle, #eee); border-radius: 6px; padding: 1px 3px; }
.pb-swatch i { width: 14px; height: 14px; border-radius: 3px; display: inline-block; border: 1px solid rgba(0,0,0,.1); }
.pb-swatch input[type=color] { width: 20px; height: 20px; padding: 0; border: 0; background: none; }
.pb-hex { width: 74px; font-size: 12px; font-family: ui-monospace, monospace; }
.pb-value { font-size: 13px; }
.pb-summary { max-height: 320px; overflow: auto; }
.pb-md h4, .pb-md h5, .pb-md h6 { margin: 6px 0 2px; }
.pb-md p { margin: 2px 0; }
.pb-md ul, .pb-md ol { margin: 2px 0; padding-left: 20px; }
.pb-actions { display: flex; align-items: flex-end; gap: 8px; border-top: 1px solid var(--ds-border-subtle, #eee); padding-top: 10px; }
.pb-spacer { flex: 1; }
.pb-revise { display: flex; gap: 6px; align-items: flex-end; flex: 1; }
.pb-revise textarea { flex: 1; }
.pb-btn { font: inherit; border-radius: 8px; padding: 5px 14px; cursor: pointer; border: 1px solid var(--ds-border-default, #ddd); background: var(--ds-bg-elevated, #fff); color: inherit; }
.pb-btn--primary { background: var(--ds-accent, #6d4aff); border-color: var(--ds-accent, #6d4aff); color: #fff; font-weight: 600; }
.pb-btn--primary:disabled { opacity: .5; cursor: default; }
.pb-btn--ghost { background: none; }
.pb-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--ds-text-secondary, #555); padding: 3px 2px; }
.pb-row-main { flex: 1; min-width: 0; }
.pb-row--completed .pb-row-icon { color: #1e7a3a; }
.pb-row--in_progress .pb-row-icon { color: #2756c5; }
.pb-snapshot { margin: 0; padding-left: 20px; }
.pb-toggle { font: inherit; font-size: 12px; border: 1px solid transparent; background: none; border-radius: 8px; padding: 3px 8px; cursor: pointer; color: var(--ds-text-secondary, #666); white-space: nowrap; }
.pb-toggle:hover { background: var(--ds-bg-hover, #f0f0f0); }
.pb-toggle--on { color: var(--ds-accent, #6d4aff); border-color: color-mix(in srgb, var(--ds-accent, #6d4aff) 40%, transparent); background: color-mix(in srgb, var(--ds-accent, #6d4aff) 8%, transparent); }
`;
