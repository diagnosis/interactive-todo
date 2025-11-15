package secure

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/crypto/argon2"
)

const (
	// Argon2id parameters - these are secure baseline values
	// Recommended by OWASP as of 2023
	argonTime    = 1         // number of iterations (passes over memory)
	argonMemory  = 64 * 1024 // 64 MB (in KiB)
	argonThreads = 4         // number of parallel threads
	argonKeyLen  = 32        // length of the derived key (256 bits)
	argonSaltLen = 16        // length of salt (128 bits)
)

var (
	ErrInvalidHash     = errors.New("invalid hash format")
	ErrInvalidPassword = errors.New("invalid password")
	ErrHashGeneration  = errors.New("hash generation failed")
)

// Config holds Argon2id parameters (for future customization)
type Config struct {
	Time    uint32
	Memory  uint32
	Threads uint8
	KeyLen  uint32
	SaltLen uint32
}

// DefaultConfig returns the recommended default configuration
func DefaultConfig() *Config {
	return &Config{
		Time:    argonTime,
		Memory:  argonMemory,
		Threads: argonThreads,
		KeyLen:  argonKeyLen,
		SaltLen: argonSaltLen,
	}
}

// HashPassword returns an encoded Argon2id hash string
// Format: argon2id$v=19$t=1$m=65536$p=4$<salt>$<hash>
func HashPassword(password string) (string, error) {
	return HashPasswordWithConfig(password, DefaultConfig())
}

// HashPasswordWithConfig allows custom Argon2id parameters
func HashPasswordWithConfig(password string, cfg *Config) (string, error) {
	// Validate input
	if password == "" {
		return "", fmt.Errorf("%w: password cannot be empty", ErrInvalidPassword)
	}
	if len(password) > 128 {
		return "", fmt.Errorf("%w: password too long (max 128 chars)", ErrInvalidPassword)
	}

	// Generate random salt
	salt := make([]byte, cfg.SaltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("%w: %v", ErrHashGeneration, err)
	}

	// Generate hash
	hash := argon2.IDKey(
		[]byte(password),
		salt,
		cfg.Time,
		cfg.Memory,
		cfg.Threads,
		cfg.KeyLen,
	)

	// Encode with all parameters for future compatibility
	encoded := fmt.Sprintf("argon2id$v=%d$t=%d$m=%d$p=%d$%s$%s",
		argon2.Version,
		cfg.Time,
		cfg.Memory,
		cfg.Threads,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(hash),
	)

	return encoded, nil
}

// VerifyPassword checks whether a plaintext password matches a stored Argon2id hash
func VerifyPassword(password, encoded string) (bool, error) {
	// Validate inputs
	if password == "" {
		return false, fmt.Errorf("%w: password cannot be empty", ErrInvalidPassword)
	}
	if encoded == "" {
		return false, fmt.Errorf("%w: hash cannot be empty", ErrInvalidHash)
	}

	// Parse the encoded hash
	params, salt, hash, err := decodeHash(encoded)
	if err != nil {
		return false, err
	}

	// Generate hash with same parameters
	got := argon2.IDKey(
		[]byte(password),
		salt,
		params.Time,
		params.Memory,
		params.Threads,
		uint32(len(hash)),
	)

	// Constant-time comparison to prevent timing attacks
	match := subtle.ConstantTimeCompare(got, hash) == 1
	return match, nil
}

// VerifyPasswordSimple is a convenience wrapper that returns only bool
// Use this when you don't need to handle parsing errors separately
func VerifyPasswordSimple(password, encoded string) bool {
	match, _ := VerifyPassword(password, encoded)
	return match
}

// decodeHash parses an encoded Argon2id hash string
func decodeHash(encoded string) (*Config, []byte, []byte, error) {
	parts := strings.Split(encoded, "$")

	// Expected format: argon2id$v=19$t=1$m=65536$p=4$<salt>$<hash>
	if len(parts) != 7 {
		return nil, nil, nil, fmt.Errorf("%w: expected 7 parts, got %d", ErrInvalidHash, len(parts))
	}

	if parts[0] != "argon2id" {
		return nil, nil, nil, fmt.Errorf("%w: not an argon2id hash", ErrInvalidHash)
	}

	// Parse version
	versionStr := strings.TrimPrefix(parts[1], "v=")
	version, err := strconv.ParseUint(versionStr, 10, 32)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("%w: invalid version: %v", ErrInvalidHash, err)
	}
	if uint32(version) != argon2.Version {
		return nil, nil, nil, fmt.Errorf("%w: unsupported version %d (expected %d)",
			ErrInvalidHash, version, argon2.Version)
	}

	// Parse parameters
	tStr := strings.TrimPrefix(parts[2], "t=")
	mStr := strings.TrimPrefix(parts[3], "m=")
	pStr := strings.TrimPrefix(parts[4], "p=")

	t, err := strconv.ParseUint(tStr, 10, 32)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("%w: invalid time parameter: %v", ErrInvalidHash, err)
	}
	m, err := strconv.ParseUint(mStr, 10, 32)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("%w: invalid memory parameter: %v", ErrInvalidHash, err)
	}
	p, err := strconv.ParseUint(pStr, 10, 8)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("%w: invalid threads parameter: %v", ErrInvalidHash, err)
	}

	// Decode salt
	salt, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return nil, nil, nil, fmt.Errorf("%w: invalid salt encoding: %v", ErrInvalidHash, err)
	}

	// Decode hash
	hash, err := base64.RawStdEncoding.DecodeString(parts[6])
	if err != nil {
		return nil, nil, nil, fmt.Errorf("%w: invalid hash encoding: %v", ErrInvalidHash, err)
	}

	params := &Config{
		Time:    uint32(t),
		Memory:  uint32(m),
		Threads: uint8(p),
		KeyLen:  uint32(len(hash)),
		SaltLen: uint32(len(salt)),
	}

	return params, salt, hash, nil
}

// NeedsRehash checks if a hash needs to be regenerated with new parameters
// Useful for upgrading security parameters over time
func NeedsRehash(encoded string) bool {
	params, _, _, err := decodeHash(encoded)
	if err != nil {
		return true // If we can't parse it, it needs rehashing
	}

	cfg := DefaultConfig()
	return params.Time != cfg.Time ||
		params.Memory != cfg.Memory ||
		params.Threads != cfg.Threads ||
		params.KeyLen != cfg.KeyLen
}
