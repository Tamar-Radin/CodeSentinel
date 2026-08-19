#!/usr/bin/env python3
"""CLI entry point: python scan.py <target_path> [--out findings.json]"""
import argparse
import json
import sys

from dotenv import load_dotenv

from core.orchestrator import Orchestrator


def main():
    load_dotenv()
    parser = argparse.ArgumentParser(description="Security Agent — scan a repo for vulnerabilities")
    parser.add_argument("target", help="Path to the repository/directory to scan")
    parser.add_argument("--out", default="findings.json", help="Output JSON file for findings")
    args = parser.parse_args()

    orchestrator = Orchestrator(target_path=args.target)
    findings = orchestrator.run()

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(findings, f, indent=2, ensure_ascii=False)

    print(f"Scan complete. {len(findings)} finding(s) written to {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
