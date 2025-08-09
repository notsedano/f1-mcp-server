import axios from 'axios';
import fs from 'fs';

const AGENT_URL = 'http://localhost:11435/api/chat';
const MODEL = 'gemini-1.5-flash';

async function callAgent(query) {
  try {
    const res = await axios.post(
      AGENT_URL,
      {
        model: MODEL,
        messages: [{ role: 'user', content: query }],
        stream: false
      },
      {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return res.data?.message?.content ?? '';
  } catch (err) {
    const msg = err?.response?.data || err?.message || String(err);
    return `ERROR: ${JSON.stringify(msg)}`;
  }
}

async function runTest(name, steps, results) {
  console.log(`\n===== ${name} =====`);
  const testLog = { name, steps: [] };

  for (let i = 0; i < steps.length; i++) {
    const q = steps[i].query;
    console.log(`\nQ${i + 1}: ${q}`);
    const answer = await callAgent(q);
    console.log(`A${i + 1}: ${answer}\n`);

    testLog.steps.push({ query: q, answer });
  }

  results.push(testLog);
}

async function main() {
  const results = [];
  console.log('🚀 Running Top-Down Intelligence Assessment (single session, server-side context)...');

  // Phase 1 — High-level cognition
  await runTest('1) Multi-dimensional comparison', [
    { query: "Compare Max Verstappen and Lewis Hamilton's performance in the 2024 season" }
  ], results);

  await runTest('2) Contextual reasoning (follow-ups)', [
    { query: 'Who won the 2024 Bahrain Grand Prix?' },
    { query: 'What about their fastest lap?' },
    { query: 'How did they perform compared to their teammate?' }
  ], results);

  await runTest('3) Temporal intelligence', [
    { query: "What's the current championship situation and who's likely to win next?" }
  ], results);

  await runTest('4) Ambiguity resolution', [
    { query: 'What happened in Monaco?' }
  ], results);

  await runTest('5) Cross-domain team analysis', [
    { query: "Analyze Red Bull's dominance this season and explain their strategy" }
  ], results);

  // Phase 2 — Strategic edge cases
  await runTest('6) Data availability', [
    { query: 'What was the weather like during the 2024 Monaco Grand Prix?' }
  ], results);

  await runTest('7) Live vs historical', [
    { query: "What's happening in the current race?" }
  ], results);

  await runTest('8) Complex comparative (session types)', [
    { query: 'How do the current top 3 drivers compare in qualifying vs race performance?' }
  ], results);

  // Phase 3 — Advanced intelligence
  await runTest('9) Predictive/analytical', [
    { query: "Based on current form, who's most likely to challenge for the championship?" }
  ], results);

  await runTest('10) User-intent adaptation', [
    { query: "I'm new to F1—explain what happened in the last race" }
  ], results);

  // Persist results
  const outPath = 'assessment-results.json';
  fs.writeFileSync(outPath, JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
  console.log(`\n✅ Assessment complete. Results saved to ${outPath}`);
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});