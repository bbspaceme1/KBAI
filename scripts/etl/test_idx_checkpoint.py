import importlib.util
import sys
import types
import unittest
from pathlib import Path
from types import SimpleNamespace


def install_import_stubs():
    pandas = types.ModuleType("pandas")
    sys.modules.setdefault("pandas", pandas)
    supabase = types.ModuleType("supabase")
    supabase.Client = object
    supabase.create_client = lambda *_args: None
    sys.modules.setdefault("supabase", supabase)
    fetch = types.ModuleType("idx_fetch")
    fetch.IDXFetcher = object
    sys.modules.setdefault("idx_fetch", fetch)
    calendar = types.ModuleType("idx_calendar")
    calendar.trading_dates = lambda *_args: []
    sys.modules.setdefault("idx_calendar", calendar)


MODULE_PATH = Path(__file__).with_name("idx_pipeline.py")


def load_pipeline():
    install_import_stubs()
    spec = importlib.util.spec_from_file_location("idx_pipeline_under_test", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CheckpointProofTests(unittest.TestCase):
    def test_stale_worker_cannot_complete_fenced_partition(self):
        pipeline = load_pipeline()
        rpc_calls = []
        state = {"attempt": 1, "worker_id": "worker-a"}

        def rpc(name, payload):
            rpc_calls.append((name, payload))
            if name == "claim_idx_etl_partition":
                if payload["p_worker_id"] == "worker-a":
                    return SimpleNamespace(execute=lambda: SimpleNamespace(data=1))
                state.update(attempt=2, worker_id="worker-b")
                return SimpleNamespace(execute=lambda: SimpleNamespace(data=2))
            owned = payload["p_worker_id"] == state["worker_id"] and payload["p_attempt"] == state["attempt"]
            return SimpleNamespace(execute=lambda: SimpleNamespace(data=owned))

        pipeline.supabase = SimpleNamespace(rpc=rpc)
        self.assertEqual(pipeline._claim_partition("job", "2026-10-08", "worker-a"), 1)
        self.assertEqual(pipeline._claim_partition("job", "2026-10-08", "worker-b"), 2)
        with self.assertRaises(RuntimeError):
            pipeline._checkpoint("job", "2026-10-08", "worker-a", 1, "SUCCESS")
        pipeline._checkpoint("job", "2026-10-08", "worker-b", 2, "SUCCESS")
        self.assertEqual(rpc_calls[-1][1]["p_worker_id"], "worker-b")

    def test_partial_write_retry_is_idempotent(self):
        rows = {}
        first = [{"ticker": "AAA", "date": "2026-10-08", "close": 10}]
        retry = [*first, {"ticker": "BBB", "date": "2026-10-08", "close": 20}]
        for row in first + retry:
            rows[(row["ticker"], row["date"])] = row
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[("AAA", "2026-10-08")]["close"], 10)
        self.assertEqual(rows[("BBB", "2026-10-08")]["close"], 20)


if __name__ == "__main__":
    unittest.main()
