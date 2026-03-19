// Verified through apps/playground/tsconfig.verify.json against built package exports.
import {
  buildWorkspacePlan,
  topologicallyOrderWorkspace,
} from "@spectotal/workspace-graph";

async function main(): Promise<void> {
  const plan = buildWorkspacePlan("workspace-cycle", { profileId: "w3c" }, [
    { documentId: "B", uri: "fixtures/workspace/cycle/B.md" },
    { documentId: "C", uri: "fixtures/workspace/cycle/C.md" },
  ]);

  const result = topologicallyOrderWorkspace({
    workspaceId: plan.workspaceId,
    nodes: {
      B: { documentId: "B", uri: "fixtures/workspace/cycle/B.md" },
      C: { documentId: "C", uri: "fixtures/workspace/cycle/C.md" },
    },
    edges: [
      { from: "B", to: "C", kind: "reference" },
      { from: "C", to: "B", kind: "reference" },
    ],
  });

  console.log("Expected manual check: workspace-cycle diagnostic");
  console.log(JSON.stringify(result, null, 2));
}

void main();
