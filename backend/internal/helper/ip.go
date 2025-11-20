package helper

import (
	"net"
	"net/http"
	"strings"
)

func GetClientIP(r *http.Request) string {
	// Prefer X-Forwarded-For (first IP)
	if xff := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
	}

	// Fallback to X-Real-IP
	if xRealIP := strings.TrimSpace(r.Header.Get("X-Real-IP")); xRealIP != "" {
		return xRealIP
	}

	// Finally, use RemoteAddr (host:port)
	remote := strings.TrimSpace(r.RemoteAddr)
	if remote == "" {
		return ""
	}

	host, _, err := net.SplitHostPort(remote)
	if err != nil {
		// If it fails (e.g., no port), just return raw
		return remote
	}
	return host
}
