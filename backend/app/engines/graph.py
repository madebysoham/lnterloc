import time
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, List, Set
import networkx as nx

from backend.app.config import settings
from backend.app.db.session import SessionLocal, init_db
from backend.app.db.models import GraphEdgeModel, LockedAccountModel


class MuleGraphEngine:
    """
    Dynamic Directed Multigraph Engine for In-Flight Mule Network Detection
    and Automated Multi-Node Kill-Switch Cascades with Local SQLite Persistence.
    """

    def __init__(self):
        self.graph = nx.MultiDiGraph()
        self.locked_nodes: Set[str] = set()
        self.account_metadata: Dict[str, Dict[str, Any]] = {}
        init_db()  # Ensure database tables exist
        self._rehydrate_from_db()
        self._seed_baseline_graph()

    def _rehydrate_from_db(self):
        """Loads historical graph edges and locked nodes from SQLite on boot."""
        db = SessionLocal()
        try:
            # 1. Load locked accounts
            locked_records = db.query(LockedAccountModel).all()
            for lk in locked_records:
                self.locked_nodes.add(lk.account_hash)

            # 2. Load historical transaction edges
            edges = db.query(GraphEdgeModel).order_by(GraphEdgeModel.id.asc()).all()
            for edge in edges:
                if not self.graph.has_node(edge.payer_hash):
                    self.graph.add_node(
                        edge.payer_hash,
                        is_locked=edge.payer_hash in self.locked_nodes,
                        first_seen=edge.timestamp_unix,
                    )
                if not self.graph.has_node(edge.payee_hash):
                    self.graph.add_node(
                        edge.payee_hash,
                        is_locked=edge.payee_hash in self.locked_nodes,
                        first_seen=edge.timestamp_unix,
                    )

                self.graph.add_edge(
                    edge.payer_hash,
                    edge.payee_hash,
                    amount=edge.amount_inr,
                    timestamp=edge.timestamp_unix,
                    transaction_id=edge.transaction_id,
                )
        finally:
            db.close()

    def _seed_baseline_graph(self):
        """Pre-populates sample historical banking graph nodes for testing and simulation."""
        current_time = time.time()
        if not self.graph.has_node("ACC_BENIGN_MERCHANT"):
            self.graph.add_node("ACC_BENIGN_MERCHANT", is_locked=False, baseline_monthly=1500000.0)
        if not self.graph.has_node("ACC_KNOWN_EMPLOYER"):
            self.graph.add_node("ACC_KNOWN_EMPLOYER", is_locked=False, baseline_monthly=5000000.0)

    def record_transaction(
        self,
        payer_hash: str,
        payee_hash: str,
        amount_inr: float,
        transaction_id: str = "TXN_UNTARGETED",
        timestamp_unix: float = None,
    ):
        """Appends a directed transaction edge in memory and commits to SQLite."""
        if timestamp_unix is None:
            timestamp_unix = time.time()

        if not self.graph.has_node(payer_hash):
            self.graph.add_node(payer_hash, is_locked=payer_hash in self.locked_nodes, first_seen=timestamp_unix)
        if not self.graph.has_node(payee_hash):
            self.graph.add_node(payee_hash, is_locked=payee_hash in self.locked_nodes, first_seen=timestamp_unix)

        self.graph.add_edge(
            payer_hash,
            payee_hash,
            amount=amount_inr,
            timestamp=timestamp_unix,
            transaction_id=transaction_id,
        )

        # Persist edge to SQLite in WAL mode
        db = SessionLocal()
        try:
            db_edge = GraphEdgeModel(
                transaction_id=transaction_id,
                payer_hash=payer_hash,
                payee_hash=payee_hash,
                amount_inr=amount_inr,
                timestamp_unix=timestamp_unix,
            )
            db.add(db_edge)
            db.commit()
        finally:
            db.close()

    def evaluate_payee(self, payee_hash: str, amount_inr: float) -> Tuple[float, int]:
        """
        Computes the Mule Network Index in [0, 1] and predicted hop depth.
        Evaluates In-Degree Velocity (IDV), Out-Degree Fan-Out Ratio (OFR), and Dormancy Bursts.
        """
        if not self.graph.has_node(payee_hash):
            return 0.35, 1

        now = time.time()
        # 1. In-Degree Velocity (IDV) in the last 1 hour (3600s)
        in_edges = self.graph.in_edges(payee_hash, data=True)
        recent_in_edges = [
            d for _, _, d in in_edges
            if (now - d.get("timestamp", now)) <= 3600
        ]
        idv = len(recent_in_edges)

        # 2. Out-Degree Fan-Out Ratio (OFR)
        out_edges = self.graph.out_edges(payee_hash, data=True)
        out_degree = len(out_edges)
        in_degree = max(1, len(in_edges))
        ofr = out_degree / float(in_degree)

        # 3. Check if node is already marked suspicious or locked
        is_already_locked = payee_hash in self.locked_nodes
        if is_already_locked:
            return 0.98, 2

        # 4. Hop Depth Estimation (based on out-degree layering connections)
        hop_depth = 1
        if ofr >= 2.0 or out_degree >= 2:
            hop_depth = 2
            for _, neighbor in out_edges:
                if self.graph.out_degree(neighbor) > 0:
                    hop_depth = 3
                    break

        # Compute composite Mule Network Index
        mule_score = 0.20
        if idv >= 3:
            mule_score += 0.35
        elif idv >= 1:
            mule_score += 0.15

        if ofr >= 1.5:
            mule_score += 0.25

        if amount_inr >= 35000.0:
            mule_score += 0.15

        mule_score = round(min(0.99, max(0.05, mule_score)), 4)
        return mule_score, hop_depth

    def trigger_kill_switch_cascade(
        self,
        primary_payee_hash: str,
        transaction_amount_inr: float,
        transaction_id: str = "TXN_ALERT_ROOT",
        max_hops: int = 2,
    ) -> Dict[str, Any]:
        """
        Executes Multi-Node Kill-Switch Cascade across primary beneficiary (Hop 1)
        and correlated downstream layering accounts (Hop 2), persisting locks to SQLite.
        """
        frozen_nodes: List[str] = []
        total_frozen_inr = transaction_amount_inr

        db = SessionLocal()
        try:
            # Hop 1: Primary Beneficiary
            if primary_payee_hash not in self.locked_nodes:
                self.locked_nodes.add(primary_payee_hash)
                frozen_nodes.append(primary_payee_hash)
                db.merge(
                    LockedAccountModel(
                        account_hash=primary_payee_hash,
                        reason="Primary Beneficiary Mule Concentrator Lock",
                        triggering_transaction_id=transaction_id,
                        cascade_hop=1,
                    )
                )

            # Traverse downstream up to max_hops (Hop 2)
            if self.graph.has_node(primary_payee_hash):
                current_layer = {primary_payee_hash}
                for hop in range(1, max_hops + 1):
                    next_layer = set()
                    for node in current_layer:
                        for _, target, data in self.graph.out_edges(node, data=True):
                            if target not in self.locked_nodes:
                                self.locked_nodes.add(target)
                                frozen_nodes.append(target)
                                next_layer.add(target)
                                total_frozen_inr += data.get("amount", 0.0)
                                db.merge(
                                    LockedAccountModel(
                                        account_hash=target,
                                        reason=f"Downstream Layering Mule Cascade (Hop {hop+1})",
                                        triggering_transaction_id=transaction_id,
                                        cascade_hop=hop + 1,
                                    )
                                )
                    current_layer = next_layer
            db.commit()
        finally:
            db.close()

        return {
            "kill_switch_active": True,
            "root_node": primary_payee_hash,
            "frozen_nodes_count": len(frozen_nodes),
            "frozen_nodes": frozen_nodes,
            "total_liquidity_frozen_inr": round(total_frozen_inr, 2),
            "cascade_depth": max_hops,
        }


graph_engine = MuleGraphEngine()
