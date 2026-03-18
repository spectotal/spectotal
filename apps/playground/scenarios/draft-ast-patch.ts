import type {
  AstNode,
  AstPath,
  CanonicalAstNode,
  CanonicalDocumentAst,
  DraftDocumentAst,
  Provenance,
} from "@spectotal/ast";
import { applyPatches, type AstPatch } from "@spectotal/ast-patch";
import { findAll, findFirst, visit } from "@spectotal/ast-query";
import { w3cSchema } from "@spectotal/profile-w3c";


interface TextNode extends AstNode {
  value: string
}

type InlineNode = 
 | TextNode

interface ParagraphNode extends AstNode {
  kind: "paragraph",
  children: InlineNode[]
}

type BlockNode =
 | ParagraphNode

interface DocumentNode extends AstNode {
  children?: readonly BlockNode[]
}
type W3cNode = DocumentNode;

const boom: DraftDocumentAst<W3cNode> = {
  root: {
    kind: "document",
    children:[
      {
        kind: "paragraph",
        id: 'p',
        children: [
          {
            kind: "text", 
            value: "text value"            
          }
        ]

      }
    ] 
  },
  profileId: 'w3c'
}

function findPathById(root: AstNode, targetId: string): AstPath | undefined {
  let found: AstPath | undefined;

  visit(root, (node, path) => {
    if (!found && node.id === targetId) {
      found = path;
    }
  });

  return found;
}
export default async function run(): Promise<unknown> {

  const firstSection = findFirst(boom.root, { kind: "paragraph" });
  const byId = findFirst(boom.root, {id: 'p'})
  console.log('byId', byId)  

  return {
    firstSection,
    byId,
    boom
  }
}
