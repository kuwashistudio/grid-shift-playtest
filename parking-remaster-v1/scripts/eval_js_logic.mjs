import fs from "node:fs";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const logic=require("../game_logic.js");

const level=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
const states=JSON.parse(fs.readFileSync(0,"utf8"));
const output=states.map(active=>({
  active,
  legal:logic.legalMoves(level,active),
  blockers:Object.fromEntries(active.map(id=>[id,logic.blockerId(level,id,active)]))
}));
process.stdout.write(JSON.stringify(output));
