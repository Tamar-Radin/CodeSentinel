from verification.oracles import ORACLE_REGISTRY, decide_path_traversal, decide_stubbed_auth_check
from verification.types import Evidence, VerificationStatus


def test_decide_stubbed_auth_check_confirmed_when_deleted_without_auth():
    evidence = Evidence(attack={"status": 200, "readback_status": 404})
    assert decide_stubbed_auth_check(evidence) == VerificationStatus.CONFIRMED


def test_decide_stubbed_auth_check_not_confirmed_when_denied():
    evidence = Evidence(attack={"status": 401, "readback_status": 200})
    assert decide_stubbed_auth_check(evidence) == VerificationStatus.NOT_CONFIRMED


def test_decide_stubbed_auth_check_inconclusive_on_setup_error():
    evidence = Evidence(raw={"setup_error": "register_failed_status_500"})
    assert decide_stubbed_auth_check(evidence) == VerificationStatus.INCONCLUSIVE


def test_decide_stubbed_auth_check_inconclusive_on_unresolved_endpoint():
    evidence = Evidence(raw={"resolution_error": "endpoint_not_resolved"})
    assert decide_stubbed_auth_check(evidence) == VerificationStatus.INCONCLUSIVE


def test_decide_stubbed_auth_check_inconclusive_when_status_deleted_but_row_still_exists():
    # 2xx alone is not enough — the read-back must also confirm the row is actually gone.
    evidence = Evidence(attack={"status": 200, "readback_status": 200})
    assert decide_stubbed_auth_check(evidence) == VerificationStatus.INCONCLUSIVE


def test_decide_path_traversal_confirmed_when_canary_token_present():
    evidence = Evidence(attack={"status": 200, "body": "...abc123...secret..."}, raw={"canary_token": "abc123"})
    assert decide_path_traversal(evidence) == VerificationStatus.CONFIRMED


def test_decide_path_traversal_not_confirmed_when_blocked():
    evidence = Evidence(attack={"status": 404, "body": "not found"}, raw={"canary_token": "abc123"})
    assert decide_path_traversal(evidence) == VerificationStatus.NOT_CONFIRMED


def test_decide_path_traversal_does_not_match_a_stale_or_different_token():
    evidence = Evidence(attack={"status": 200, "body": "some other content"}, raw={"canary_token": "abc123"})
    assert decide_path_traversal(evidence) == VerificationStatus.INCONCLUSIVE


def test_decide_path_traversal_does_not_confirm_on_token_reflected_by_a_non_200_error_body():
    # Regression test for a real bug found during manual validation: Flask's default error
    # handler can echo the *requested* filename (which contains our canary token) back inside a
    # 500 error message even when the file was genuinely NOT found/served. Status alone (500,
    # not 200) must prevent a false CONFIRMED here — token-in-body is necessary but not
    # sufficient; only a 200 means send_file actually streamed real content.
    evidence = Evidence(
        attack={"status": 500, "body": '{"error": "No such file: .../rv_canary_TOKEN123.txt"}'},
        raw={"canary_token": "TOKEN123"},
    )
    assert decide_path_traversal(evidence) == VerificationStatus.INCONCLUSIVE


def test_decide_path_traversal_inconclusive_on_unresolved_endpoint():
    evidence = Evidence(raw={"resolution_error": "endpoint_not_resolved"})
    assert decide_path_traversal(evidence) == VerificationStatus.INCONCLUSIVE


def test_oracle_registry_covers_exactly_the_phase_1_patterns():
    assert set(ORACLE_REGISTRY) == {"stubbed_auth_check", "path_traversal"}
