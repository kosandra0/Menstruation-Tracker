//go:build windows

// Menstruation Tracker - standalone Windows foundation preview.
// This is a lightweight Win32 shell used when the Tauri/MSVC toolchain is
// unavailable. The production desktop app remains the React + Tauri project.
package main

import (
	"fmt"
	"os"
	"syscall"
	"unsafe"
)

const (
	windowClass = "MenstruationTrackerWindow"
	appTitle    = "Menstruation Tracker"
	appVersion  = "v0.1.1"

	WM_DESTROY                   = 0x0002
	WM_SIZE                      = 0x0005
	WM_ERASEBKGND                = 0x0014
	WM_PAINT                     = 0x000F
	WM_NCHITTEST                 = 0x0084
	WM_LBUTTONDOWN               = 0x0201
	HTCLIENT                     = 1
	HTCAPTION                    = 2
	HTTOP                        = 12
	HTTOPLEFT                    = 13
	HTTOPRIGHT                   = 14
	CS_HREDRAW                   = 0x0002
	CS_VREDRAW                   = 0x0001
	WS_POPUP                     = 0x80000000
	WS_THICKFRAME                = 0x00040000
	WS_MINIMIZEBOX               = 0x00020000
	WS_MAXIMIZEBOX               = 0x00010000
	WS_SYSMENU                   = 0x00080000
	WS_EX_APPWINDOW              = 0x00040000
	SW_SHOW                      = 5
	SW_MINIMIZE                  = 6
	SW_MAXIMIZE                  = 3
	SW_RESTORE                   = 9
	SWP_NOMOVE                   = 0x0002
	SWP_NOZORDER                 = 0x0004
	SWP_NOACTIVATE               = 0x0010
	IDC_ARROW                    = 32512
	TRANSPARENT                  = 1
	DT_LEFT                      = 0x0000
	DT_CENTER                    = 0x0001
	DT_RIGHT                     = 0x0002
	DT_VCENTER                   = 0x0004
	DT_WORDBREAK                 = 0x0010
	DT_SINGLELINE                = 0x0020
	DT_END_ELLIPSIS              = 0x8000
	DT_NOPREFIX                  = 0x0800
	FW_NORMAL                    = 400
	FW_SEMIBOLD                  = 600
	FW_BOLD                      = 700
	DEFAULT_CHARSET              = 1
	OUT_DEFAULT_PRECIS           = 0
	CLIP_DEFAULT_PRECIS          = 0
	CLEARTYPE_QUALITY            = 5
	DEFAULT_PITCH                = 0
	FF_DONTCARE                  = 0
	PS_SOLID                     = 0
	DWM_WINDOW_CORNER_PREFERENCE = 33
	DWMWCP_ROUND                 = 2
)

type POINT struct{ X, Y int32 }
type RECT struct{ Left, Top, Right, Bottom int32 }
type PAINTSTRUCT struct {
	Hdc         uintptr
	Erase       int32
	RcPaint     RECT
	Restore     int32
	IncUpdate   int32
	RgbReserved [32]byte
}
type MSG struct {
	Hwnd    uintptr
	Message uint32
	WParam  uintptr
	LParam  uintptr
	Time    uint32
	Pt      POINT
	Private uint32
}
type WNDCLASSEX struct {
	CbSize     uint32
	Style      uint32
	WndProc    uintptr
	ClsExtra   int32
	WndExtra   int32
	Instance   uintptr
	Icon       uintptr
	Cursor     uintptr
	Background uintptr
	MenuName   *uint16
	ClassName  *uint16
	IconSm     uintptr
}

type Palette struct {
	Name                                     string
	Accent, AccentSoft                       uint32
	Background, Sidebar, Surface, SurfaceAlt uint32
	Border, Text, Muted, Good, Warning       uint32
}

type AppState struct {
	HWND          uintptr
	Page          int
	Theme         int
	Dark          bool
	Width, Height int
}

var state = AppState{Page: 0, Theme: 0, Dark: false, Width: 1360, Height: 880}
var (
	user32   = syscall.NewLazyDLL("user32.dll")
	gdi32    = syscall.NewLazyDLL("gdi32.dll")
	kernel32 = syscall.NewLazyDLL("kernel32.dll")
	dwmapi   = syscall.NewLazyDLL("dwmapi.dll")

	pRegisterClassExW      = user32.NewProc("RegisterClassExW")
	pCreateWindowExW       = user32.NewProc("CreateWindowExW")
	pDefWindowProcW        = user32.NewProc("DefWindowProcW")
	pShowWindow            = user32.NewProc("ShowWindow")
	pUpdateWindow          = user32.NewProc("UpdateWindow")
	pGetMessageW           = user32.NewProc("GetMessageW")
	pTranslateMessage      = user32.NewProc("TranslateMessage")
	pDispatchMessageW      = user32.NewProc("DispatchMessageW")
	pPostQuitMessage       = user32.NewProc("PostQuitMessage")
	pBeginPaint            = user32.NewProc("BeginPaint")
	pEndPaint              = user32.NewProc("EndPaint")
	pInvalidateRect        = user32.NewProc("InvalidateRect")
	pGetClientRect         = user32.NewProc("GetClientRect")
	pGetWindowRect         = user32.NewProc("GetWindowRect")
	pSetWindowPos          = user32.NewProc("SetWindowPos")
	pLoadCursorW           = user32.NewProc("LoadCursorW")
	pDestroyWindow         = user32.NewProc("DestroyWindow")
	pIsZoomed              = user32.NewProc("IsZoomed")
	pFillRect              = user32.NewProc("FillRect")
	pCreateSolidBrush      = gdi32.NewProc("CreateSolidBrush")
	pDeleteObject          = gdi32.NewProc("DeleteObject")
	pCreateRoundRectRgn    = gdi32.NewProc("CreateRoundRectRgn")
	pFillRgn               = gdi32.NewProc("FillRgn")
	pFrameRgn              = gdi32.NewProc("FrameRgn")
	pCreatePen             = gdi32.NewProc("CreatePen")
	pSelectObject          = gdi32.NewProc("SelectObject")
	pRoundRect             = gdi32.NewProc("RoundRect")
	pEllipse               = gdi32.NewProc("Ellipse")
	pMoveToEx              = gdi32.NewProc("MoveToEx")
	pLineTo                = gdi32.NewProc("LineTo")
	pSetTextColor          = gdi32.NewProc("SetTextColor")
	pSetBkMode             = gdi32.NewProc("SetBkMode")
	pCreateFontW           = gdi32.NewProc("CreateFontW")
	pDrawTextW             = user32.NewProc("DrawTextW")
	pGetModuleHandleW      = kernel32.NewProc("GetModuleHandleW")
	pDwmSetWindowAttribute = dwmapi.NewProc("DwmSetWindowAttribute")
)

var palettes = []Palette{
	{Name: "Lavender Dream", Accent: rgb(151, 126, 190), AccentSoft: rgb(238, 231, 248), Background: rgb(248, 246, 251), Sidebar: rgb(252, 250, 254), Surface: rgb(255, 255, 255), SurfaceAlt: rgb(246, 242, 250), Border: rgb(233, 226, 241), Text: rgb(51, 44, 62), Muted: rgb(133, 124, 146), Good: rgb(95, 151, 124), Warning: rgb(190, 143, 95)},
	{Name: "Rosewater", Accent: rgb(190, 123, 148), AccentSoft: rgb(248, 232, 239), Background: rgb(251, 247, 248), Sidebar: rgb(255, 251, 252), Surface: rgb(255, 255, 255), SurfaceAlt: rgb(249, 240, 244), Border: rgb(239, 226, 232), Text: rgb(62, 45, 53), Muted: rgb(143, 123, 132), Good: rgb(95, 151, 124), Warning: rgb(190, 143, 95)},
	{Name: "Sage Garden", Accent: rgb(112, 145, 124), AccentSoft: rgb(229, 239, 232), Background: rgb(247, 249, 247), Sidebar: rgb(252, 254, 252), Surface: rgb(255, 255, 255), SurfaceAlt: rgb(239, 245, 240), Border: rgb(226, 235, 228), Text: rgb(43, 57, 47), Muted: rgb(119, 137, 124), Good: rgb(80, 145, 105), Warning: rgb(181, 143, 91)},
	{Name: "Ocean Mist", Accent: rgb(104, 145, 174), AccentSoft: rgb(228, 239, 247), Background: rgb(246, 249, 251), Sidebar: rgb(251, 253, 255), Surface: rgb(255, 255, 255), SurfaceAlt: rgb(238, 245, 249), Border: rgb(224, 234, 241), Text: rgb(42, 57, 68), Muted: rgb(118, 137, 150), Good: rgb(85, 151, 130), Warning: rgb(185, 145, 93)},
	{Name: "Warm Sand", Accent: rgb(173, 139, 101), AccentSoft: rgb(244, 235, 223), Background: rgb(250, 248, 244), Sidebar: rgb(255, 253, 249), Surface: rgb(255, 255, 255), SurfaceAlt: rgb(246, 241, 232), Border: rgb(235, 228, 216), Text: rgb(61, 53, 43), Muted: rgb(139, 128, 112), Good: rgb(103, 147, 110), Warning: rgb(183, 137, 83)},
	{Name: "Midnight", Accent: rgb(176, 151, 218), AccentSoft: rgb(63, 54, 79), Background: rgb(27, 25, 33), Sidebar: rgb(31, 29, 38), Surface: rgb(38, 35, 46), SurfaceAlt: rgb(47, 43, 56), Border: rgb(61, 56, 70), Text: rgb(239, 234, 246), Muted: rgb(167, 158, 181), Good: rgb(126, 186, 151), Warning: rgb(220, 174, 120)},
}

func rgb(r, g, b uint32) uint32 { return r | (g << 8) | (b << 16) }
func pal() Palette {
	p := palettes[state.Theme%len(palettes)]
	if !state.Dark && state.Theme == 5 {
		// Midnight also has a usable light variant instead of remaining dark-only.
		p.Background = rgb(248, 246, 251)
		p.Sidebar = rgb(252, 250, 254)
		p.Surface = rgb(255, 255, 255)
		p.SurfaceAlt = rgb(244, 239, 250)
		p.Border = rgb(231, 223, 241)
		p.Text = rgb(53, 44, 67)
		p.Muted = rgb(132, 121, 148)
		p.AccentSoft = rgb(236, 228, 247)
	}
	if state.Dark {
		p.Background = rgb(26, 24, 32)
		p.Sidebar = rgb(30, 28, 37)
		p.Surface = rgb(37, 34, 45)
		p.SurfaceAlt = rgb(47, 43, 56)
		p.Border = rgb(62, 57, 72)
		p.Text = rgb(240, 235, 246)
		p.Muted = rgb(169, 160, 181)
		if state.Theme != 5 {
			p.AccentSoft = rgb(62, 54, 73)
		}
	}
	return p
}
func utf16(s string) *uint16 { p, _ := syscall.UTF16PtrFromString(s); return p }
func invalidate() {
	if state.HWND != 0 {
		pInvalidateRect.Call(state.HWND, 0, 1)
	}
}

func fill(hdc uintptr, x, y, w, h int, color uint32) {
	if w <= 0 || h <= 0 {
		return
	}
	brush, _, _ := pCreateSolidBrush.Call(uintptr(color))
	r := RECT{int32(x), int32(y), int32(x + w), int32(y + h)}
	pFillRect.Call(hdc, uintptr(unsafe.Pointer(&r)), brush)
	pDeleteObject.Call(brush)
}
func rounded(hdc uintptr, x, y, w, h, radius int, color uint32, border uint32) {
	if w <= 0 || h <= 0 {
		return
	}
	brush, _, _ := pCreateSolidBrush.Call(uintptr(color))
	region, _, _ := pCreateRoundRectRgn.Call(uintptr(x), uintptr(y), uintptr(x+w+1), uintptr(y+h+1), uintptr(radius*2), uintptr(radius*2))
	pFillRgn.Call(hdc, region, brush)
	pDeleteObject.Call(brush)
	if border != color {
		borderBrush, _, _ := pCreateSolidBrush.Call(uintptr(border))
		pFrameRgn.Call(hdc, region, borderBrush, 1, 1)
		pDeleteObject.Call(borderBrush)
	}
	pDeleteObject.Call(region)
}
func circle(hdc uintptr, x, y, d int, color uint32, border uint32) {
	brush, _, _ := pCreateSolidBrush.Call(uintptr(color))
	pen, _, _ := pCreatePen.Call(PS_SOLID, 1, uintptr(border))
	oldB, _, _ := pSelectObject.Call(hdc, brush)
	oldP, _, _ := pSelectObject.Call(hdc, pen)
	pEllipse.Call(hdc, uintptr(x), uintptr(y), uintptr(x+d), uintptr(y+d))
	pSelectObject.Call(hdc, oldB)
	pSelectObject.Call(hdc, oldP)
	pDeleteObject.Call(brush)
	pDeleteObject.Call(pen)
}
func line(hdc uintptr, x1, y1, x2, y2 int, color uint32, thickness int) {
	pen, _, _ := pCreatePen.Call(PS_SOLID, uintptr(thickness), uintptr(color))
	old, _, _ := pSelectObject.Call(hdc, pen)
	pMoveToEx.Call(hdc, uintptr(x1), uintptr(y1), 0)
	pLineTo.Call(hdc, uintptr(x2), uintptr(y2))
	pSelectObject.Call(hdc, old)
	pDeleteObject.Call(pen)
}
func text(hdc uintptr, value string, x, y, w, h, size int, color uint32, weight int, align uint32) {
	if w <= 0 || h <= 0 {
		return
	}
	face := utf16("Segoe UI")
	font, _, _ := pCreateFontW.Call(uintptr(-size), 0, 0, 0, uintptr(weight), 0, 0, 0, DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY, DEFAULT_PITCH|FF_DONTCARE, uintptr(unsafe.Pointer(face)))
	wide, err := syscall.UTF16FromString(value)
	if err != nil || len(wide) == 0 {
		if font != 0 {
			pDeleteObject.Call(font)
		}
		return
	}
	old, _, _ := pSelectObject.Call(hdc, font)
	pSetTextColor.Call(hdc, uintptr(color))
	pSetBkMode.Call(hdc, TRANSPARENT)
	r := RECT{int32(x), int32(y), int32(x + w), int32(y + h)}
	flags := align | DT_VCENTER | DT_NOPREFIX | DT_END_ELLIPSIS
	if h > size+10 {
		flags = align | DT_WORDBREAK | DT_NOPREFIX
	}
	// DrawTextW expects UTF-16 code units, excluding the trailing NUL.
	pDrawTextW.Call(hdc, uintptr(unsafe.Pointer(&wide[0])), uintptr(len(wide)-1), uintptr(unsafe.Pointer(&r)), uintptr(flags))
	pSelectObject.Call(hdc, old)
	pDeleteObject.Call(font)
}
func card(hdc uintptr, x, y, w, h int, p Palette) { rounded(hdc, x, y, w, h, 16, p.Surface, p.Border) }
func pill(hdc uintptr, label string, x, y, w int, bg, fg uint32) {
	rounded(hdc, x, y, w, 28, 14, bg, bg)
	text(hdc, label, x+8, y, w-16, 28, 11, fg, FW_SEMIBOLD, DT_CENTER)
}
func button(hdc uintptr, label string, x, y, w, h int, p Palette, primary bool) {
	bg, fg := p.SurfaceAlt, p.Text
	if primary {
		bg, fg = p.Accent, rgb(255, 255, 255)
	}
	rounded(hdc, x, y, w, h, 10, bg, bg)
	text(hdc, label, x+10, y, w-20, h, 12, fg, FW_SEMIBOLD, DT_CENTER)
}
func titlebar(hdc uintptr, w int, p Palette) {
	fill(hdc, 0, 0, w, 42, p.Background)
	circle(hdc, 18, 13, 16, p.Accent, p.Accent)
	text(hdc, "M", 18, 12, 16, 18, 10, rgb(255, 255, 255), FW_BOLD, DT_CENTER)
	text(hdc, appTitle, 44, 4, 190, 34, 12, p.Text, FW_SEMIBOLD, DT_LEFT)
	text(hdc, "PERSONAL WELLNESS COMPANION", 238, 4, 250, 34, 9, p.Muted, FW_NORMAL, DT_LEFT)
	// Windows controls.
	text(hdc, "−", w-142, 1, 44, 39, 20, p.Muted, FW_NORMAL, DT_CENTER)
	text(hdc, "□", w-98, 1, 44, 39, 13, p.Muted, FW_NORMAL, DT_CENTER)
	text(hdc, "×", w-54, 1, 44, 39, 19, p.Muted, FW_NORMAL, DT_CENTER)
	line(hdc, 0, 41, w, 41, p.Border, 1)
}
func sidebar(hdc uintptr, h int, p Palette) {
	fill(hdc, 0, 42, 238, h-42, p.Sidebar)
	line(hdc, 237, 42, 237, h, p.Border, 1)
	circle(hdc, 24, 66, 38, p.AccentSoft, p.AccentSoft)
	text(hdc, "✿", 24, 67, 38, 34, 20, p.Accent, FW_NORMAL, DT_CENTER)
	text(hdc, "Menstruation", 72, 64, 145, 24, 15, p.Text, FW_SEMIBOLD, DT_LEFT)
	text(hdc, "TRACKER", 73, 87, 120, 18, 9, p.Muted, FW_SEMIBOLD, DT_LEFT)
	text(hdc, appVersion+"  ·  FOUNDATION", 24, 123, 194, 22, 9, p.Muted, FW_NORMAL, DT_LEFT)
	line(hdc, 20, 152, 218, 152, p.Border, 1)
	text(hdc, "YOUR SPACE", 24, 164, 190, 20, 9, p.Muted, FW_SEMIBOLD, DT_LEFT)
	names := []string{"Dashboard", "Cycle Calendar", "Daily Log", "Insights", "Health Journal", "Reminders", "Settings"}
	icons := []string{"⌂", "▦", "✎", "⌁", "▤", "◷", "⚙"}
	for i, n := range names {
		y := 190 + i*51
		if state.Page == i {
			rounded(hdc, 14, y, 210, 42, 10, p.AccentSoft, p.AccentSoft)
		}
		iconColor := p.Muted
		labelColor := p.Muted
		if state.Page == i {
			iconColor = p.Accent
			labelColor = p.Text
		}
		text(hdc, icons[i], 28, y+1, 25, 40, 16, iconColor, FW_NORMAL, DT_CENTER)
		text(hdc, n, 62, y+1, 145, 40, 12, labelColor, func() int {
			if state.Page == i {
				return FW_SEMIBOLD
			}
			return FW_NORMAL
		}(), DT_LEFT)
	}
	// Privacy footer.
	fy := h - 108
	line(hdc, 20, fy, 218, fy, p.Border, 1)
	circle(hdc, 24, fy+19, 28, p.AccentSoft, p.AccentSoft)
	text(hdc, "◇", 24, fy+18, 28, 28, 15, p.Accent, FW_NORMAL, DT_CENTER)
	text(hdc, "Your data, your choice", 62, fy+17, 152, 20, 10, p.Text, FW_SEMIBOLD, DT_LEFT)
	text(hdc, "Local-first by design", 62, fy+37, 152, 18, 9, p.Muted, FW_NORMAL, DT_LEFT)
}
func mainHeader(hdc uintptr, w int, p Palette, title, subtitle string) {
	text(hdc, title, 274, 70, w-620, 40, 25, p.Text, FW_SEMIBOLD, DT_LEFT)
	text(hdc, subtitle, 275, 108, w-620, 28, 11, p.Muted, FW_NORMAL, DT_LEFT)
	// Theme and mode quick controls.
	rounded(hdc, w-310, 74, 160, 38, 10, p.Surface, p.Border)
	circle(hdc, w-296, 85, 15, p.AccentSoft, p.AccentSoft)
	text(hdc, "◈", w-296, 84, 15, 18, 10, p.Accent, FW_NORMAL, DT_CENTER)
	text(hdc, p.Name, w-275, 74, 114, 38, 10, p.Text, FW_SEMIBOLD, DT_LEFT)
	rounded(hdc, w-140, 74, 104, 38, 10, p.Surface, p.Border)
	text(hdc, func() string {
		if state.Dark {
			return "☾  Dark"
		}
		return "☼  Light"
	}(), w-136, 74, 96, 38, 10, p.Text, FW_SEMIBOLD, DT_CENTER)
}
func drawDashboard(hdc uintptr, w, h int, p Palette) {
	mainHeader(hdc, w, p, "A little more in tune.", "A calm space to understand patterns and care for yourself.")
	x, y := 274, 164
	leftW := (w - 274 - 36 - 30) * 58 / 100
	rightX := x + leftW + 18
	rightW := w - rightX - 36
	card(hdc, x, y, leftW, 238, p)
	text(hdc, "CYCLE OVERVIEW", x+24, y+20, 200, 22, 9, p.Muted, FW_SEMIBOLD, DT_LEFT)
	pill(hdc, "ILLUSTRATIVE PREVIEW", x+leftW-174, y+17, 150, p.AccentSoft, p.Accent)
	circle(hdc, x+28, y+61, 142, p.AccentSoft, p.AccentSoft)
	text(hdc, "DAY", x+28, y+89, 142, 22, 10, p.Muted, FW_SEMIBOLD, DT_CENTER)
	text(hdc, "12", x+28, y+108, 142, 56, 43, p.Text, FW_SEMIBOLD, DT_CENTER)
	text(hdc, "of 29", x+28, y+163, 142, 22, 11, p.Muted, FW_NORMAL, DT_CENTER)
	text(hdc, "A gentle check-in with your cycle", x+200, y+68, leftW-225, 28, 15, p.Text, FW_SEMIBOLD, DT_LEFT)
	text(hdc, "This sample view shows how an overview could look once you choose to add your own entries.", x+200, y+102, leftW-230, 58, 11, p.Muted, FW_NORMAL, DT_LEFT)
	text(hdc, "CYCLE PROGRESS", x+200, y+174, 140, 20, 9, p.Muted, FW_SEMIBOLD, DT_LEFT)
	rounded(hdc, x+200, y+199, leftW-230, 8, 4, p.SurfaceAlt, p.SurfaceAlt)
	rounded(hdc, x+200, y+199, (leftW-230)*41/100, 8, 4, p.Accent, p.Accent)
	text(hdc, "Illustrative cycle day only", x+200, y+211, leftW-225, 20, 9, p.Muted, FW_NORMAL, DT_LEFT)
	card(hdc, rightX, y, rightW, 238, p)
	text(hdc, "LOOKING AHEAD", rightX+22, y+21, rightW-44, 20, 9, p.Muted, FW_SEMIBOLD, DT_LEFT)
	text(hdc, "A little preparation", rightX+22, y+57, rightW-44, 28, 16, p.Text, FW_SEMIBOLD, DT_LEFT)
	text(hdc, "Your next period estimate will appear here after enough cycle history is recorded.", rightX+22, y+91, rightW-44, 60, 11, p.Muted, FW_NORMAL, DT_LEFT)
	line(hdc, rightX+22, y+165, rightX+rightW-22, y+165, p.Border, 1)
	circle(hdc, rightX+22, y+181, 28, p.AccentSoft, p.AccentSoft)
	text(hdc, "✦", rightX+22, y+180, 28, 28, 14, p.Accent, FW_NORMAL, DT_CENTER)
	text(hdc, "Estimates are never guarantees", rightX+60, y+178, rightW-80, 20, 10, p.Text, FW_SEMIBOLD, DT_LEFT)
	text(hdc, "Not for contraception or diagnosis", rightX+60, y+198, rightW-80, 18, 9, p.Muted, FW_NORMAL, DT_LEFT)
	// Lower cards.
	lowerY := y + 256
	left2 := (w - 274 - 36 - 36) / 2
	card(hdc, x, lowerY, left2, 232, p)
	text(hdc, "TODAY'S CHECK-IN", x+22, lowerY+20, left2-44, 20, 9, p.Muted, FW_SEMIBOLD, DT_LEFT)
	text(hdc, "How are you feeling?", x+22, lowerY+51, left2-44, 28, 16, p.Text, FW_SEMIBOLD, DT_LEFT)
	text(hdc, "A small daily note can help reveal patterns over time.", x+22, lowerY+83, left2-44, 38, 10, p.Muted, FW_NORMAL, DT_LEFT)
	pill(hdc, "Mood", x+22, lowerY+132, 64, p.SurfaceAlt, p.Muted)
	pill(hdc, "Energy", x+94, lowerY+132, 76, p.SurfaceAlt, p.Muted)
	pill(hdc, "Symptoms", x+178, lowerY+132, 90, p.SurfaceAlt, p.Muted)
	button(hdc, "Open daily log  →", x+22, lowerY+179, 154, 34, p, true)
	card(hdc, x+left2+18, lowerY, left2, 232, p)
	text(hdc, "YOUR PERSONAL SPACE", x+left2+40, lowerY+20, left2-44, 20, 9, p.Muted, FW_SEMIBOLD, DT_LEFT)
	text(hdc, "Private by default.", x+left2+40, lowerY+51, left2-44, 28, 16, p.Text, FW_SEMIBOLD, DT_LEFT)
	text(hdc, "Your personal health information belongs to you. Sharing and backup should always be your choice.", x+left2+40, lowerY+87, left2-76, 60, 10, p.Muted, FW_NORMAL, DT_LEFT)
	pill(hdc, "LOCAL-FIRST DESIGN", x+left2+40, lowerY+164, 132, p.AccentSoft, p.Accent)
}
func drawCalendar(hdc uintptr, w, h int, p Palette) {
	mainHeader(hdc, w, p, "Cycle Calendar", "A clear view of your history, one day at a time.")
	x, y := 274, 164
	cw := w - x - 36
	card(hdc, x, y, cw, h-206, p)
	text(hdc, "NOVEMBER 2026", x+24, y+22, 220, 26, 14, p.Text, FW_SEMIBOLD, DT_LEFT)
	pill(hdc, "SAMPLE VIEW", x+cw-142, y+17, 118, p.AccentSoft, p.Accent)
	weeks := []string{"SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"}
	cell := (cw - 48) / 7
	for i, v := range weeks {
		text(hdc, v, x+24+i*cell, y+70, cell, 24, 9, p.Muted, FW_SEMIBOLD, DT_CENTER)
	}
	startY := y + 104
	for day := 1; day <= 30; day++ {
		col := (day + 5) % 7
		row := (day + 5) / 7
		xx := x + 24 + col*cell
		yy := startY + row*58
		if day == 15 {
			circle(hdc, xx+cell/2-17, yy+5, 34, p.Accent, p.Accent)
			text(hdc, fmt.Sprintf("%d", day), xx+cell/2-17, yy+5, 34, 34, 11, rgb(255, 255, 255), FW_SEMIBOLD, DT_CENTER)
		} else {
			text(hdc, fmt.Sprintf("%d", day), xx, yy+5, cell, 34, 11, p.Text, FW_NORMAL, DT_CENTER)
		}
		if day == 9 || day == 10 {
			circle(hdc, xx+cell/2-3, yy+40, 6, p.Accent, p.Accent)
		}
	}
	line(hdc, x+24, startY+5*58+50, x+cw-24, startY+5*58+50, p.Border, 1)
	text(hdc, "Calendar entries shown here are illustrative. Your personal history will appear once you add it.", x+24, startY+5*58+61, cw-48, 28, 10, p.Muted, FW_NORMAL, DT_LEFT)
}
func drawDailyLog(hdc uintptr, w, h int, p Palette) {
	mainHeader(hdc, w, p, "Daily Log", "A gentle place to record how today feels.")
	x, y := 274, 164
	cw := w - x - 36
	card(hdc, x, y, cw, 168, p)
	text(hdc, "TODAY'S ENTRY", x+24, y+22, 180, 20, 9, p.Muted, FW_SEMIBOLD, DT_LEFT)
	text(hdc, "Start with how you're feeling.", x+24, y+55, cw-48, 30, 18, p.Text, FW_SEMIBOLD, DT_LEFT)
	text(hdc, "Track only what feels useful. You can skip any category and edit your entries later.", x+24, y+92, cw-48, 44, 11, p.Muted, FW_NORMAL, DT_LEFT)
	button(hdc, "Create an entry  →", x+24, y+123, 170, 34, p, true)
	items := []string{"Mood & emotions", "Physical symptoms", "Flow intensity", "Sleep & energy", "Personal notes"}
	for i, s := range items {
		yy := y + 190 + i*64
		card(hdc, x, yy, cw, 58, p)
		circle(hdc, x+18, yy+15, 28, p.AccentSoft, p.AccentSoft)
		text(hdc, []string{"♡", "✦", "◌", "☾", "✎"}[i], x+18, yy+14, 28, 28, 14, p.Accent, FW_NORMAL, DT_CENTER)
		text(hdc, s, x+62, yy+3, cw-100, 52, 12, p.Text, FW_SEMIBOLD, DT_LEFT)
		text(hdc, "Not recorded", x+cw-180, yy+3, 156, 52, 10, p.Muted, FW_NORMAL, DT_RIGHT)
	}
}
func drawInsights(hdc uintptr, w, h int, p Palette) {
	mainHeader(hdc, w, p, "Cycle Insights", "Notice patterns at your own pace, without pressure.")
	x, y := 274, 164
	cw := w - x - 36
	gap := 16
	cardW := (cw - gap) / 2
	titles := []string{"Cycle length", "Period duration", "Symptoms over time", "Mood patterns"}
	desc := []string{"Your typical cycle range will be calculated from your entries.", "A clear overview of your recorded period days.", "Explore which symptoms you tend to record and when.", "See how your mood notes change across your cycle."}
	for i := 0; i < 4; i++ {
		xx := x + (i%2)*(cardW+gap)
		yy := y + (i/2)*180
		card(hdc, xx, yy, cardW, 160, p)
		text(hdc, titles[i], xx+22, yy+16, cardW-44, 24, 13, p.Text, FW_SEMIBOLD, DT_LEFT)
		text(hdc, "Waiting for your data", xx+22, yy+53, cardW-44, 27, 16, p.Accent, FW_SEMIBOLD, DT_LEFT)
		text(hdc, desc[i], xx+22, yy+88, cardW-44, 48, 10, p.Muted, FW_NORMAL, DT_LEFT)
	}
	pill(hdc, "PERSONAL PATTERNS, NOT MEDICAL DIAGNOSES", x, y+376, 270, p.AccentSoft, p.Accent)
}
func drawJournal(hdc uintptr, w, h int, p Palette) {
	mainHeader(hdc, w, p, "Health Journal", "Keep personal notes and observations in one private place.")
	x, y := 274, 164
	cw := w - x - 36
	card(hdc, x, y, cw, 150, p)
	text(hdc, "A note to yourself", x+24, y+20, 240, 24, 15, p.Text, FW_SEMIBOLD, DT_LEFT)
	text(hdc, "Capture a question, a symptom you want to remember, or anything you'd like to discuss with a healthcare professional.", x+24, y+56, cw-48, 50, 11, p.Muted, FW_NORMAL, DT_LEFT)
	button(hdc, "New journal note  +", x+24, y+103, 166, 34, p, true)
	card(hdc, x, y+170, cw, 110, p)
	text(hdc, "Your journal is ready when you are.", x+24, y+186, cw-48, 28, 13, p.Text, FW_SEMIBOLD, DT_LEFT)
	text(hdc, "No entries have been created in this preview. Personal notes should remain private and editable.", x+24, y+221, cw-48, 40, 10, p.Muted, FW_NORMAL, DT_LEFT)
}
func drawReminders(hdc uintptr, w, h int, p Palette) {
	mainHeader(hdc, w, p, "Reminders", "Choose gentle nudges that work for your routine.")
	x, y := 274, 164
	cw := w - x - 36
	titles := []string{"Upcoming period reminder", "Daily check-in", "Medication reminder", "Quiet notification mode"}
	desc := []string{"Optional advance notice based on your recorded cycle history.", "A gentle prompt to log mood, symptoms or energy.", "User-configured reminders for medication or supplements.", "Keep notification text discreet on your lock screen."}
	for i := 0; i < 4; i++ {
		yy := y + i*86
		card(hdc, x, yy, cw, 70, p)
		circle(hdc, x+18, yy+20, 30, p.AccentSoft, p.AccentSoft)
		text(hdc, "◷", x+18, yy+20, 30, 30, 14, p.Accent, FW_NORMAL, DT_CENTER)
		text(hdc, titles[i], x+64, yy+8, cw-260, 24, 12, p.Text, FW_SEMIBOLD, DT_LEFT)
		text(hdc, desc[i], x+64, yy+34, cw-260, 26, 10, p.Muted, FW_NORMAL, DT_LEFT)
		pill(hdc, "NOT CONFIGURED", x+cw-144, yy+20, 120, p.SurfaceAlt, p.Muted)
	}
	text(hdc, "No notifications are scheduled by this foundation preview.", x, y+365, cw, 28, 10, p.Muted, FW_NORMAL, DT_LEFT)
}
func drawSettings(hdc uintptr, w, h int, p Palette) {
	mainHeader(hdc, w, p, "Settings", "Make your space feel comfortable and familiar.")
	x, y := 274, 164
	cw := w - x - 36
	card(hdc, x, y, cw, 126, p)
	text(hdc, "Appearance", x+22, y+16, 200, 26, 15, p.Text, FW_SEMIBOLD, DT_LEFT)
	text(hdc, "Choose a palette and switch between light and dark mode.", x+22, y+49, cw-44, 22, 10, p.Muted, FW_NORMAL, DT_LEFT)
	pill(hdc, "LIGHT / DARK", x+22, y+83, 104, p.AccentSoft, p.Accent)
	button(hdc, func() string {
		if state.Dark {
			return "Switch to light"
		}
		return "Switch to dark"
	}(), x+cw-188, y+76, 164, 36, p, false)
	card(hdc, x, y+144, cw, 242, p)
	text(hdc, "Theme collection", x+22, y+160, 220, 26, 15, p.Text, FW_SEMIBOLD, DT_LEFT)
	text(hdc, "Six calm palettes, each with light and dark variants.", x+22, y+190, cw-44, 20, 10, p.Muted, FW_NORMAL, DT_LEFT)
	cellW := (cw - 64) / 3
	for i, th := range palettes {
		col := i % 3
		row := i / 3
		xx := x + 22 + col*(cellW+10)
		yy := y + 224 + row*64
		selected := state.Theme == i
		border := p.Border
		if selected {
			border = th.Accent
		}
		rounded(hdc, xx, yy, cellW, 52, 10, p.SurfaceAlt, border)
		circle(hdc, xx+12, yy+16, 20, th.Accent, th.Accent)
		circle(hdc, xx+27, yy+16, 20, th.AccentSoft, th.AccentSoft)
		text(hdc, th.Name, xx+56, yy, cellW-62, 52, 10, p.Text, FW_SEMIBOLD, DT_LEFT)
		if selected {
			text(hdc, "✓", xx+cellW-26, yy, 18, 52, 12, th.Accent, FW_BOLD, DT_CENTER)
		}
	}
	card(hdc, x, y+392, cw, 104, p)
	text(hdc, "Privacy & data", x+22, y+404, 220, 24, 14, p.Text, FW_SEMIBOLD, DT_LEFT)
	text(hdc, "This preview stores no health records. Future storage and backup controls will be explicit and user-controlled.", x+22, y+434, cw-44, 45, 10, p.Muted, FW_NORMAL, DT_LEFT)
}
func paint(hdc uintptr) {
	var rc RECT
	pGetClientRect.Call(state.HWND, uintptr(unsafe.Pointer(&rc)))
	w, h := int(rc.Right), int(rc.Bottom)
	if w < 400 || h < 300 {
		return
	}
	state.Width, state.Height = w, h
	p := pal()
	fill(hdc, 0, 0, w, h, p.Background)
	titlebar(hdc, w, p)
	sidebar(hdc, h, p)
	switch state.Page {
	case 0:
		drawDashboard(hdc, w, h, p)
	case 1:
		drawCalendar(hdc, w, h, p)
	case 2:
		drawDailyLog(hdc, w, h, p)
	case 3:
		drawInsights(hdc, w, h, p)
	case 4:
		drawJournal(hdc, w, h, p)
	case 5:
		drawReminders(hdc, w, h, p)
	case 6:
		drawSettings(hdc, w, h, p)
	}
	// Small persistent foundation marker.
	text(hdc, "FOUNDATION PREVIEW  ·  SAMPLE CONTENT ONLY", w-340, h-25, 304, 18, 8, p.Muted, FW_NORMAL, DT_RIGHT)
}
func pointFromLParam(lp uintptr) (int, int) {
	return int(int16(uint16(lp))), int(int16(uint16(lp >> 16)))
}
func windowProc(hwnd uintptr, msg uint32, wParam, lParam uintptr) uintptr {
	switch msg {
	case WM_ERASEBKGND:
		return 1
	case WM_PAINT:
		var ps PAINTSTRUCT
		hdc, _, _ := pBeginPaint.Call(hwnd, uintptr(unsafe.Pointer(&ps)))
		paint(hdc)
		pEndPaint.Call(hwnd, uintptr(unsafe.Pointer(&ps)))
		return 0
	case WM_SIZE:
		// Keep the content layout usable without dereferencing OS-owned message pointers.
		var client, outer RECT
		pGetClientRect.Call(hwnd, uintptr(unsafe.Pointer(&client)))
		if int(client.Right) < 1080 || int(client.Bottom) < 700 {
			pGetWindowRect.Call(hwnd, uintptr(unsafe.Pointer(&outer)))
			newW := int(outer.Right-outer.Left) + max(0, 1080-int(client.Right))
			newH := int(outer.Bottom-outer.Top) + max(0, 700-int(client.Bottom))
			pSetWindowPos.Call(hwnd, 0, 0, 0, uintptr(newW), uintptr(newH), SWP_NOMOVE|SWP_NOZORDER|SWP_NOACTIVATE)
		}
		invalidate()
		return 0
	case WM_NCHITTEST:
		res, _, _ := pDefWindowProcW.Call(hwnd, uintptr(msg), wParam, lParam)
		if res == HTTOP || res == HTTOPLEFT || res == HTTOPRIGHT {
			return res
		}
		var wr RECT
		pGetWindowRect.Call(hwnd, uintptr(unsafe.Pointer(&wr)))
		sx := int(int16(uint16(lParam)))
		sy := int(int16(uint16(lParam >> 16)))
		rx := sx - int(wr.Left)
		ry := sy - int(wr.Top)
		if ry >= 0 && ry < 42 {
			if rx > state.Width-150 {
				return HTCLIENT
			}
			return HTCAPTION
		}
		return res
	case WM_LBUTTONDOWN:
		x, y := pointFromLParam(lParam)
		if y < 42 {
			switch {
			case x >= state.Width-54:
				pDestroyWindow.Call(hwnd)
				return 0
			case x >= state.Width-98:
				zoomed, _, _ := pIsZoomed.Call(hwnd)
				if zoomed != 0 {
					pShowWindow.Call(hwnd, SW_RESTORE)
				} else {
					pShowWindow.Call(hwnd, SW_MAXIMIZE)
				}
				return 0
			case x >= state.Width-142:
				pShowWindow.Call(hwnd, SW_MINIMIZE)
				return 0
			}
		}
		if y >= 74 && y <= 112 {
			if x >= state.Width-140 {
				state.Dark = !state.Dark
				invalidate()
				return 0
			}
			if x >= state.Width-310 && x < state.Width-150 {
				state.Theme = (state.Theme + 1) % len(palettes)
				invalidate()
				return 0
			}
		}
		if x < 238 && y >= 190 && y < 190+7*51 {
			idx := (y - 190) / 51
			if idx >= 0 && idx < 7 {
				state.Page = idx
				invalidate()
			}
			return 0
		}
		if state.Page == 6 {
			if y >= 240 && y <= 310 && x > state.Width-240 {
				state.Dark = !state.Dark
				invalidate()
				return 0
			}
			if y >= 388 && y <= 530 && x >= 296 && x < state.Width-36 {
				colW := (state.Width - 274 - 36 - 64) / 3
				col := (x - 296) / (colW + 10)
				row := (y - 388) / 64
				idx := row*3 + col
				if idx >= 0 && idx < len(palettes) {
					state.Theme = idx
					invalidate()
				}
				return 0
			}
		}
		if state.Page == 0 && y >= 599 && y <= 654 && x >= 290 && x < 510 {
			state.Page = 2
			invalidate()
			return 0
		}
		return 0
	case WM_DESTROY:
		pPostQuitMessage.Call(0)
		return 0
	}
	ret, _, _ := pDefWindowProcW.Call(hwnd, uintptr(msg), wParam, lParam)
	return ret
}
func main() {
	instance, _, _ := pGetModuleHandleW.Call(0)
	className := utf16(windowClass)
	cursor, _, _ := pLoadCursorW.Call(0, IDC_ARROW)
	cb := syscall.NewCallback(windowProc)
	wc := WNDCLASSEX{CbSize: uint32(unsafe.Sizeof(WNDCLASSEX{})), Style: CS_HREDRAW | CS_VREDRAW, WndProc: cb, Instance: instance, Cursor: cursor, ClassName: className}
	if atom, _, err := pRegisterClassExW.Call(uintptr(unsafe.Pointer(&wc))); atom == 0 {
		fmt.Fprintln(os.Stderr, "RegisterClassExW:", err)
		os.Exit(1)
	}
	style := uintptr(WS_POPUP | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU)
	hwnd, _, err := pCreateWindowExW.Call(WS_EX_APPWINDOW, uintptr(unsafe.Pointer(className)), uintptr(unsafe.Pointer(utf16(appTitle))), style, 90, 65, 1360, 880, 0, 0, instance, 0)
	if hwnd == 0 {
		fmt.Fprintln(os.Stderr, "CreateWindowExW:", err)
		os.Exit(1)
	}
	state.HWND = hwnd
	corner := uint32(DWMWCP_ROUND)
	pDwmSetWindowAttribute.Call(hwnd, DWM_WINDOW_CORNER_PREFERENCE, uintptr(unsafe.Pointer(&corner)), unsafe.Sizeof(corner))
	pShowWindow.Call(hwnd, SW_SHOW)
	pUpdateWindow.Call(hwnd)
	var msg MSG
	for {
		r, _, _ := pGetMessageW.Call(uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
		if int32(r) <= 0 {
			break
		}
		pTranslateMessage.Call(uintptr(unsafe.Pointer(&msg)))
		pDispatchMessageW.Call(uintptr(unsafe.Pointer(&msg)))
	}
}
