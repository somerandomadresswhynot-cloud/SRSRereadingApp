import { useState } from 'react';
import { dueState } from '../lib/scheduler';
import type { UnitNode } from '../lib/types';

export function TreeView({ nodes, onOpen, onHistory }: { nodes: UnitNode[]; onOpen: (u: UnitNode) => void; onHistory: (u: UnitNode) => void }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const byParent = new Map<string | null, UnitNode[]>();
  nodes.forEach((n) => byParent.set(n.parentId, [...(byParent.get(n.parentId) ?? []), n]));

  const renderNode = (node: UnitNode, depth: number): JSX.Element => {
    const children = byParent.get(node.id) ?? [];
    const closed = !!collapsed[node.id];
    return (
      <div key={node.id}>
        <div className="tree-row" style={{ paddingLeft: `${depth * 18 + 8}px` }}>
          {children.length > 0 ? <button className="ghost" onClick={() => setCollapsed((s) => ({ ...s, [node.id]: !s[node.id] }))}>{closed ? '+' : '-'}</button> : <span className="ghost-placeholder" />}
          <div className="tree-title">{node.title}</div>
          {node.isLeaf && <span className={`pill ${dueState(node)}`}>{dueState(node)}</span>}
          <span className="muted">{node.locationLabel}</span>
          {node.isLeaf && <button className="btn" onClick={() => onOpen(node)}>Open</button>}
          {node.isLeaf && <button className="ghost" onClick={() => onHistory(node)}>History</button>}
        </div>
        {!closed && children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return <div>{(byParent.get(null) ?? []).map((n) => renderNode(n, 0))}</div>;
}
