import { buildWorkspacePlan, topologicallyOrderWorkspace } from "@spectotal/workspace-graph";

export default async function run(): Promise<unknown> {
  const plan = buildWorkspacePlan(
    "workspace-cycle",
    { profileId: "w3c" },
    [
      { documentId: "B", uri: "fixtures/workspace/cycle/B.md" },
      { documentId: "C", uri: "fixtures/workspace/cycle/C.md" },
    ],
  );

  return {
    expectation: "workspace-cycle diagnostic",
    result: topologicallyOrderWorkspace({
      workspaceId: plan.workspaceId,
      nodes: {
        B: { documentId: "B", uri: "fixtures/workspace/cycle/B.md" },
        C: { documentId: "C", uri: "fixtures/workspace/cycle/C.md" },
      },
      edges: [
        { from: "B", to: "C", kind: "reference" },
        { from: "C", to: "B", kind: "reference" },
      ],
    }),
  };
}
