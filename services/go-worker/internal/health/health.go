// Package health provides the worker's liveness and version methods.
// It never touches user data.
package health

import (
	"encoding/json"

	"github.com/menstruation-tracker/go-worker/internal/protocol"
)

// Version is the worker version; keep identical to the app version (scripts/check-version.mjs).
const Version = "0.3.1"

// Register adds the health/version methods to the router.
func Register(r protocol.Router) {
	r["health.ping"] = func(json.RawMessage) (any, *protocol.Error) {
		return map[string]string{"status": "ok"}, nil
	}
	r["worker.version"] = func(json.RawMessage) (any, *protocol.Error) {
		return map[string]any{"version": Version, "protocol": protocol.Version}, nil
	}
}
