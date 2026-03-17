import { buildWorkspacePlan, topologicallyOrderWorkspace } from "@spectotal/workspace-graph";

export default async function run(): Promise<unknown> {
  const plan = buildWorkspacePlan(
    "workspace-valid",
    { profileId: "w3c" },
    [
      { documentId: "A", uri: "fixtures/workspace/valid/A.md" },
      { documentId: "B", uri: "fixtures/workspace/valid/B.md" },
      { documentId: "C", uri: "fixtures/workspace/valid/C.md" },
    ],
  );

  return topologicallyOrderWorkspace({
    workspaceId: plan.workspaceId,
    nodes: {
      A: { documentId: "A", uri: "fixtures/workspace/valid/A.md" },
      B: { documentId: "B", uri: "fixtures/workspace/valid/B.md" },
      C: { documentId: "C", uri: "fixtures/workspace/valid/C.md" },
    },
    edges: [
      { from: "A", to: "B", kind: "reference" },
      { from: "B", to: "C", kind: "reference" },
      { from: "A", to: "C", kind: "reference" },
    ],
  });
}
