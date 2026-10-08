# v0.1.1 restyle acceptance

Host: official PI-Desktop v0.17.0, plugin installed from the packed
`io.github.galaxyxieyu.plan-board-0.1.1.piplug` (sha256 66b866a4…a999b) via
`plugins.installFromPackage`. Model: aigalaxy/gpt-6-astra. Session f8e68498.

Flow (real run, 2026-10-08 17:1x–17:29 CST):
1. Composer toggle 先出计划 on, prompt sent (01).
2. Agent submitted a 5-step plan, r1 (02).
3. Opened s3 deps line, ticked s2 -> autosaved r2; s5 shown disabled 会成环 (03).
4. Retitled s4 -> r3 (04).
5. 批准并执行 -> chip 执行计划 r3 in composer (05), sent.
6. Agent: get -> progress s1,s2,s4,s3,s5 in_progress/completed (06, 06b, 07).
   No plan-tool errors (12 plan calls). Only errors in the run came from the
   host's pi.browser plugin (CDP method not allowed / no answer).
7. Kill -9 + relaunch: card restored completed r3 with deps (08).

Notes / disclosures
- 03b uses CDP `CSS.forcePseudoState(['hover'])`; a real synthetic hover is
  dropped while `Page.captureScreenshot` runs.
- The puzzle icon on composer chips is host UI, not the plugin.
- The host collapses the "Processed for …" activity group after the turn;
  screenshots expand it first.
- pi (gemini-3.8-flash / kimi-k3) timed out, so the restyle was hand-written.
- Before images: ../ (v0.1.0). Side-by-side: compare/ (tools/compare-v011.py).
