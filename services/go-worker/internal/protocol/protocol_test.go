package protocol

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"
)

func run(t *testing.T, input string, router Router) []Response {
	t.Helper()
	var out bytes.Buffer
	if err := Serve(strings.NewReader(input), &out, router); err != nil {
		t.Fatalf("serve: %v", err)
	}
	var res []Response
	for _, l := range strings.Split(strings.TrimSpace(out.String()), "\n") {
		if l == "" {
			continue
		}
		var r Response
		if err := json.Unmarshal([]byte(l), &r); err != nil {
			t.Fatalf("bad response line %q: %v", l, err)
		}
		res = append(res, r)
	}
	return res
}

func TestDispatch(t *testing.T) {
	router := Router{"echo": func(json.RawMessage) (any, *Error) { return "ok", nil }}
	res := run(t, `{"v":1,"id":"1","method":"echo"}`+"\n", router)
	if len(res) != 1 || res[0].ID != "1" || res[0].Result != "ok" || res[0].Error != nil {
		t.Fatalf("unexpected: %+v", res)
	}
}

func TestErrors(t *testing.T) {
	input := "not json\n" + `{"v":2,"id":"a","method":"x"}` + "\n" + `{"v":1,"id":"b","method":"nope"}` + "\n"
	res := run(t, input, Router{})
	want := []string{CodeInvalidArg, CodeInvalidArg, CodeUnknownMethod}
	if len(res) != len(want) {
		t.Fatalf("got %d responses", len(res))
	}
	for i, c := range want {
		if res[i].Error == nil || res[i].Error.Code != c {
			t.Errorf("response %d: want code %s, got %+v", i, c, res[i].Error)
		}
	}
}
