#!/usr/bin/env python3
"""CLI entry point: python scan.py <target_path> [--out findings.json]"""
import argparse
import json
import sys

from dotenv import load_dotenv

from core.orchestrator import Orchestrator

VERIFY_RUNTIME_HELP = (
    "Opt-in (default off): actually run the scanned target in a process-isolated "
    "sandbox and attempt to reproduce eligible findings (Layer 6). This EXECUTES the "
    "scanned target's own code on this machine — only use it on code you own or are "
    "authorized to run. Only targets recognized by verification/registry.py are "
    "supported; any other target is left untouched."
)


def run_scan(target: str, out: str = "findings.json", verify_runtime: bool = False) -> int:
    if verify_runtime:
        print(
            "WARNING: --verify-runtime will execute the scanned target's own code locally, "
            "inside a process-isolated (not container/VM-isolated) sandbox. Only use this on "
            "code you own or are authorized to run. Unrecognized targets are skipped, not "
            "refused with an error.",
            file=sys.stderr,
        )

    orchestrator = Orchestrator(target_path=target, verify_runtime=verify_runtime)
    findings = orchestrator.run()

    with open(out, "w", encoding="utf-8") as f:
        json.dump(findings, f, indent=2, ensure_ascii=False)

    print(f"Scan complete. {len(findings)} finding(s) written to {out}")
    return 0


def main():
    load_dotenv()
    parser = argparse.ArgumentParser(description="Security Agent — scan a repo for vulnerabilities")
    parser.add_argument("target", help="Path to the repository/directory to scan")
    parser.add_argument("--out", default="findings.json", help="Output JSON file for findings")
    parser.add_argument("--verify-runtime", action="store_true", help=VERIFY_RUNTIME_HELP)
    args = parser.parse_args()

    return run_scan(args.target, args.out, args.verify_runtime)


if __name__ == "__main__":
    sys.exit(main())
