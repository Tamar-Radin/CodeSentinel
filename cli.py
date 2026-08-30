#!/usr/bin/env python3
"""Installed entry point (`security-agent`): scan a repo, or launch the findings dashboard."""
import argparse
import subprocess
import sys
from pathlib import Path

from dotenv import load_dotenv

from scan import VERIFY_RUNTIME_HELP, run_scan

DASHBOARD_APP = Path(__file__).resolve().parent / "dashboard" / "app.py"


def _dashboard(args) -> int:
    cmd = [sys.executable, "-m", "streamlit", "run", str(DASHBOARD_APP)]
    if args.findings:
        cmd += ["--", args.findings]
    return subprocess.call(cmd)


def main() -> int:
    load_dotenv()
    parser = argparse.ArgumentParser(
        prog="security-agent",
        description="Security Agent — vulnerability scanner for AI-generated code",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    scan_parser = subparsers.add_parser("scan", help="Scan a repository for vulnerabilities")
    scan_parser.add_argument("target", help="Path to the repository/directory to scan")
    scan_parser.add_argument("--out", default="findings.json", help="Output JSON file for findings")
    scan_parser.add_argument("--verify-runtime", action="store_true", help=VERIFY_RUNTIME_HELP)
    scan_parser.set_defaults(func=lambda a: run_scan(a.target, a.out, a.verify_runtime))

    dashboard_parser = subparsers.add_parser("dashboard", help="Launch the Streamlit findings dashboard")
    dashboard_parser.add_argument("findings", nargs="?", default=None, help="Path to a findings.json to preload")
    dashboard_parser.set_defaults(func=_dashboard)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
