from typing import Dict, Any, List
from fastapi import APIRouter
from backend.app.engines.graph import graph_engine


router = APIRouter(prefix="/api/v1/graph", tags=["Mule Network Graph"])


@router.get("/mule-cluster")
async def get_mule_cluster() -> Dict[str, Any]:
    """
    Returns graph topology (nodes, edges, locked accounts) for real-time visualization
    in Mintu's war-room frontend network diagram.
    """
    nodes_data: List[Dict[str, Any]] = []
    for node, data in graph_engine.graph.nodes(data=True):
        nodes_data.append({
            "id": node[:12] + "...",  # Truncated hash for readable visual presentation
            "full_hash": node,
            "is_locked": node in graph_engine.locked_nodes,
            "in_degree": graph_engine.graph.in_degree(node),
            "out_degree": graph_engine.graph.out_degree(node),
        })

    edges_data: List[Dict[str, Any]] = []
    for u, v, data in graph_engine.graph.edges(data=True):
        edges_data.append({
            "source": u[:12] + "...",
            "target": v[:12] + "...",
            "amount_inr": data.get("amount", 0.0),
            "timestamp": data.get("timestamp", 0),
        })

    return {
        "nodes": nodes_data,
        "edges": edges_data,
        "total_nodes": len(nodes_data),
        "total_edges": len(edges_data),
        "total_locked_accounts": len(graph_engine.locked_nodes),
    }


@router.get("/locked-nodes")
async def get_locked_nodes() -> Dict[str, Any]:
    """Returns all accounts locked by the Kill-Switch cascade."""
    return {
        "locked_count": len(graph_engine.locked_nodes),
        "locked_nodes": list(graph_engine.locked_nodes),
    }
