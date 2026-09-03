import { runAgentBenchmark } from "../lib/agent-benchmark";

const report = await runAgentBenchmark();
console.log(`TripIntent Agent Scenario Benchmark\n${report.passed}/${report.total} cases passed · ${report.passRate}%`);
for (const item of report.cases) {
  console.log(`\n${item.passed ? "PASS" : "FAIL"}  ${item.name}`);
  console.log(`      expected=${item.expectedStatus}${item.expectedApproval ? `/${item.expectedApproval}` : ""}`);
  console.log(`      actual=${item.actualStatus}${item.actualApproval ? `/${item.actualApproval}` : ""} · selected=${item.selectedFlightNo ?? "none"} · steps=${item.steps}`);
}
if (report.failed > 0) process.exitCode = 1;
