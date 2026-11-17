// Command worker is a short-lived helper process spawned on demand by the Tauri native layer.
// It speaks JSON-lines on stdin/stdout, exposes no network listener and logs no payloads.
package main

import (
	"fmt"
	"os"

	"github.com/menstruation-tracker/go-worker/internal/health"
	"github.com/menstruation-tracker/go-worker/internal/protocol"
)

func main() {
	router := protocol.Router{}
	health.Register(router)
	if err := protocol.Serve(os.Stdin, os.Stdout, router); err != nil {
		fmt.Fprintln(os.Stderr, "worker error:", err)
		os.Exit(1)
	}
}
