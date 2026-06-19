# Penetration / Security Tests

Negative- and attack-path tests that probe the **security logic of the
protected endpoints**. They complement the happy-path auth tests in
`tests/test_auth.py` and `tests/test_ws_auth.py`.

Every test here is tagged with the `pentest` and `security` markers
(registered in `backend/pyproject.toml`).

## Run

```bash
# only the penetration / security suite
pytest -m pentest

# this directory, verbose
pytest tests/security/ -v
```

They also run in CI (job **Backend Tests**) as a dedicated
`Run penetration / security tests` step.

## Coverage of attack scenarios

| File | Attack scenario | Expected result |
|------|-----------------|-----------------|
| `test_pentest_http_auth.py` | Protected HTTP route without token/session | `401` |
| | Manipulated / invalidly signed token (and no `sub`) on `/auth/login` | `401`, no session cookie |
| | Expired session on `/auth/refresh` | `403`, session deleted |
| | Foreign / unknown / malformed / injection session id | `401` |
| | Valid session whose user was deleted | `401`, session deleted |
| `test_pentest_ws_auth.py` | `/battle/*` WS without / malformed / unknown session | close `4001` (unauthorized) |
| | `/battle/*` WS with deleted user | close `4001` |
| | `/battle/*` WS with expired session | close `4003` (expired) |

WebSocket close codes follow the custom RFC 6455 range defined in
`app/services/ws_auth.py`: `4001 = unauthorized`, `4003 = expired`.
