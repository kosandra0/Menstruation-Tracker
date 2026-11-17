# Go worker protocol (v1)

Implemented: transport loop + `health.ping` + `worker.version`. Everything else is planned.

**Transport:** the native layer spawns `worker` on demand and exchanges UTF-8 JSON lines (one object per line, `\n`-terminated) over stdin/stdout. stderr is for non-sensitive diagnostics only. No network listener. Max line: 16 MiB. The process exits at stdin EOF.

**Request:** `{"v":1,"id":"<unique>","method":"worker.version","params":{}}`
**Success:** `{"v":1,"id":"<same>","result":{...}}`
**Failure:** `{"v":1,"id":"<same>","error":{"code":"unknown_method","message":"unknown method"}}`

Error codes: `not_implemented`, `invalid_argument`, `unknown_method`, `internal` (messages never contain health data). Malformed lines get an error response with an empty id.

| Method | Status | Result |
|---|---|---|
| `health.ping` | implemented | `{"status":"ok"}` |
| `worker.version` | implemented | `{"version":"0.1.1","protocol":1}` |
| `export.run`, `backup.create`, `integrity.check`, `report.generate` | planned | — |

Planned rules: long jobs emit `{"v":1,"id":..,"progress":0.4}` lines before the final response; file paths are passed by the native layer after user selection; database keys are never sent to the worker (it operates on exported/decrypted-by-Rust streams or already-encrypted files); requests carry no data the worker doesn't need.
