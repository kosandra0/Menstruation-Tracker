# Go worker (scaffold)

Short-lived helper process for future heavy background tasks (import/export, backup archives,
integrity checks, large reports). **Currently implements only `health.ping` and `worker.version`.**

- Transport: JSON lines over stdin/stdout. No HTTP server, no network access.
- Spawned on demand by the Tauri native layer; never talks to the frontend.
- Never logs request payloads.

```sh
go test ./...
go build -o worker ./cmd/worker
echo '{"v":1,"id":"1","method":"worker.version"}' | ./worker
```

Status: **not compiled or tested in the foundation environment** (no Go toolchain was available). Run `go test ./...` first.
`go.mod` targets Go 1.24 (the oldest release known-good for this code); raise it to the project-standard Go 1.27 once installed.
