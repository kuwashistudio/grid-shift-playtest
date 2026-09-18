import fs from "node:fs";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const logic=require("../game_logic.js");
const level=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));

let s=logic.createGameState(level);
const trace=[];
function snap(label,extra={}){
  trace.push({label,state:s,safe:logic.safeMoves(level,s),risky:logic.riskyConflictMoves(level,s),...extra});
}
snap("initial");
let r=logic.attemptLaunch(level,s,"merge_a"); s=r.state; snap("launch_a",{status:r.status,groupId:r.groupId});
r=logic.attemptLaunch(level,s,"merge_b"); snap("conflict_b",{status:r.status,failure:r.failure,stateAfter:r.state});
let alt=logic.attemptLaunch(level,s,"safe_c"); s=alt.state; snap("launch_safe_c",{status:alt.status});
s=logic.completeExit(level,s,"merge_a"); snap("complete_a");
r=logic.attemptLaunch(level,s,"merge_b"); s=r.state; snap("launch_b_after_clear",{status:r.status,groupId:r.groupId});
process.stdout.write(JSON.stringify(trace));
