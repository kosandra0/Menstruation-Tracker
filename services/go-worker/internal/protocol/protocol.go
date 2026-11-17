// Package protocol implements the JSON-lines request/response loop used between the
// Tauri native layer and the worker. One JSON object per line over stdin/stdout.
// See docs/GO_SERVICE_PROTOCOL.md. Payloads must never be logged.
package protocol

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
)

// Version is the wire-protocol version.
const Version = 1

// MaxLineBytes bounds a single request line (16 MiB).
const MaxLineBytes = 16 * 1024 * 1024

// Error codes (mirror AppErrorCode in packages/shared-types).
const (
	CodeNotImplemented = "not_implemented"
	CodeInvalidArg     = "invalid_argument"
	CodeInternal       = "internal"
	CodeUnknownMethod  = "unknown_method"
)

type Request struct {
	V      int             `json:"v"`
	ID     string          `json:"id"`
	Method string          `json:"method"`
	Params json.RawMessage `json:"params,omitempty"`
}

type Error struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e *Error) Error() string { return e.Code + ": " + e.Message }

type Response struct {
	V      int    `json:"v"`
	ID     string `json:"id"`
	Result any    `json:"result,omitempty"`
	Error  *Error `json:"error,omitempty"`
}

// Handler processes a single method call.
type Handler func(params json.RawMessage) (any, *Error)

// Router dispatches methods to handlers.
type Router map[string]Handler

// Serve reads requests from r until EOF and writes one response per line to w.
func Serve(r io.Reader, w io.Writer, router Router) error {
	sc := bufio.NewScanner(r)
	sc.Buffer(make([]byte, 0, 64*1024), MaxLineBytes)
	enc := json.NewEncoder(w) // Encode appends a newline.
	for sc.Scan() {
		line := sc.Bytes()
		if len(line) == 0 {
			continue
		}
		if err := enc.Encode(handle(line, router)); err != nil {
			return fmt.Errorf("write response: %w", err)
		}
	}
	return sc.Err()
}

func handle(line []byte, router Router) Response {
	var req Request
	if err := json.Unmarshal(line, &req); err != nil {
		return Response{V: Version, Error: &Error{Code: CodeInvalidArg, Message: "malformed request"}}
	}
	if req.V != Version {
		return Response{V: Version, ID: req.ID, Error: &Error{Code: CodeInvalidArg, Message: "unsupported protocol version"}}
	}
	h, ok := router[req.Method]
	if !ok {
		return Response{V: Version, ID: req.ID, Error: &Error{Code: CodeUnknownMethod, Message: "unknown method"}}
	}
	result, perr := h(req.Params)
	if perr != nil {
		return Response{V: Version, ID: req.ID, Error: perr}
	}
	return Response{V: Version, ID: req.ID, Result: result}
}
