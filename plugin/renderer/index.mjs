/**
 * Plan Board — renderer entry. A plain ES module with no build step; `react`
 * resolves to the host's copy through the window's import map.
 */
import { PlanToolCard } from "./board.mjs";
import { PlanFirstToggle } from "./composer.mjs";
import { bindHost } from "./host.mjs";
import { PLAN_BOARD_CSS } from "./styles.mjs";

export function onLoad(pi) {
  bindHost(pi);
  pi.ui.injectStyle(PLAN_BOARD_CSS);
  pi.slots.register({ slot: "toolCard", toolName: "plan", component: PlanToolCard });
  pi.slots.register({ slot: "composerControl", component: PlanFirstToggle, positions: ["left"] });
}
