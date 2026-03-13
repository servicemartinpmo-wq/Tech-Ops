import app from "./app";
import { startProactiveMonitor } from "./kb/proactive-monitor";
import { startAutomationEngine } from "./automationEngine";
import { startAlertMonitor } from "./alertMonitor";
import { seedKnowledgeBase } from "./services/seedKnowledge";
import { pool } from "@workspace/db";

async function main() {
  const rawPort = process.env["PORT"];

  if (!rawPort) {
    throw new Error("PORT environment variable is required but was not provided.");
  }

  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
    await pool.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");
    // ivfflat cosine index on knowledge_nodes.embedding for pgvector ANN search
    await pool.query(`
      CREATE INDEX IF NOT EXISTS knowledge_nodes_embedding_idx
      ON knowledge_nodes
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS knowledge_nodes_search_text_trgm_idx
      ON knowledge_nodes
      USING GIN (search_text gin_trgm_ops)
    `);
    console.log("PostgreSQL extensions and ivfflat cosine index ready (pgvector, pg_trgm)");
  } catch (err) {
    console.error("Failed to enable PostgreSQL extensions or create indexes:", err);
  }

  seedKnowledgeBase()
    .then(result => console.log(`Knowledge base seed: ${result.nodesCreated} nodes, ${result.edgesCreated} edges`))
    .catch(err => console.error("Knowledge base seed error:", err));

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    startProactiveMonitor(5 * 60 * 1000);
    startAutomationEngine(5 * 60 * 1000);
    startAlertMonitor(10 * 60 * 1000);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
