// Copy the tool's description and schema from lib/tool-spec.mjs into manifest.json, so they never drift.
import { readFileSync, writeFileSync } from "node:fs";
import { TOOL_DESCRIPTION, TOOL_NAME, TOOL_SCHEMA } from "../plugin/lib/tool-spec.mjs";
const path = new URL("../plugin/manifest.json", import.meta.url);
const manifest = JSON.parse(readFileSync(path, "utf8"));
manifest.contributes.agentTools = [{ name: TOOL_NAME, description: TOOL_DESCRIPTION, risk: "low", schema: TOOL_SCHEMA }];
writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
console.log("manifest synced");
