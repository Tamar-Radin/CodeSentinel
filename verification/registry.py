"""Target identity -> adapter resolution. Deliberately content-fingerprint based (see each
adapter's `identify()`) — never a path/directory-name substring check. A target directory being
named a certain way proves nothing about what's actually in it; only reading its content does.

If zero or more than one registered adapter claims a target, verification is refused entirely —
`resolve_adapter` returns None and RuntimeVerifier.verify_all() returns the finding list
completely unmodified (no partial/ambiguous verification)."""
from verification.adapters.flask_crud_adapter import FlaskCrudAdapter

# Fixed, explicit allow-list — exactly the adapters built so far. Adding a new target means
# adding its adapter here, never loosening this into a dynamic/discoverable mechanism.
REGISTERED_ADAPTERS = [FlaskCrudAdapter]


def resolve_adapter(target_path: str):
    matches = [cls for cls in REGISTERED_ADAPTERS if cls.identify(target_path)]
    if len(matches) != 1:
        return None
    return matches[0]
