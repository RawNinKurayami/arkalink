export function removeBoardNodes<T extends { nodes: {id:string}[]; edges: {source:string;target:string}[] }>(board:T, ids:readonly string[]):T {
  const removed = new Set(ids);
  return {...board, nodes: board.nodes.filter(n=>!removed.has(n.id)), edges: board.edges.filter(e=>!removed.has(e.source)&&!removed.has(e.target))};
}
