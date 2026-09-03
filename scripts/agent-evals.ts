import { runAgentEvals } from "../lib/agent-evals";

const report = await runAgentEvals();

console.log("TripIntent Agent Evals");
console.log(`${report.passed}/${report.total} gates passed · status=${report.gateStatus}`);
console.log("");

for (const item of report.results) {
  console.log(`${item.passed ? "PASS" : "FAIL"}  [${item.category}] ${item.name}`);
  console.log(`      ${item.detail}`);
}

if (report.failed > 0) process.exit(1);
