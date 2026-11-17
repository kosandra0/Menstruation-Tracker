package health

import (
	"encoding/json"
	"testing"

	"github.com/menstruation-tracker/go-worker/internal/protocol"
)

func TestRegister(t *testing.T) {
	r := protocol.Router{}
	Register(r)
	for _, m := range []string{"health.ping", "worker.version"} {
		h, ok := r[m]
		if !ok {
			t.Fatalf("missing method %s", m)
		}
		if res, err := h(json.RawMessage(nil)); err != nil || res == nil {
			t.Fatalf("%s failed: %v", m, err)
		}
	}
}
