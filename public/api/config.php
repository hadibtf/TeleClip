<?php
declare(strict_types=1);

const TELECLIP_TTL_SECONDS = 600;
const TELECLIP_MAX_TEXT_LENGTH = 10000;
const TELECLIP_RATE_WINDOW_SECONDS = 60;
const TELECLIP_RATE_MAX = 30;
const TELECLIP_HISTORY_LIMIT = 80;

function teleclip_data_dir(): string {
    $dir = __DIR__ . '/../.teleclip-data';
    if (!is_dir($dir)) {
        mkdir($dir, 0700, true);
    }
    return $dir;
}

function teleclip_json(array $payload, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function teleclip_public_url(): string {
    $configured = getenv('TELECLIP_PUBLIC_URL');
    if ($configured) {
        return rtrim($configured, '/');
    }

    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $scheme = $https ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $script = $_SERVER['SCRIPT_NAME'] ?? '/teleclip/api/create.php';
    $base = dirname(dirname($script));
    return rtrim($scheme . '://' . $host . $base, '/');
}

function teleclip_id(): string {
    return rtrim(strtr(base64_encode(random_bytes(12)), '+/', '-_'), '=');
}

function teleclip_reflect_file(): string {
    return teleclip_data_dir() . '/reflect.json';
}

function teleclip_read_reflect(): array {
    $file = teleclip_reflect_file();
    if (!is_file($file)) {
        return ['current' => null, 'history' => []];
    }

    $raw = @file_get_contents($file);
    $state = $raw ? json_decode($raw, true) : null;
    if (!is_array($state)) {
        return ['current' => null, 'history' => []];
    }

    $history = is_array($state['history'] ?? null) ? $state['history'] : [];
    return [
        'current' => $state['current'] ?? null,
        'history' => array_values(array_slice($history, 0, TELECLIP_HISTORY_LIMIT)),
    ];
}

function teleclip_write_reflect(array $state): void {
    file_put_contents(
        teleclip_reflect_file(),
        json_encode($state, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        LOCK_EX
    );
    @chmod(teleclip_reflect_file(), 0600);
}

function teleclip_valid_id(string $id): bool {
    return (bool) preg_match('/^[A-Za-z0-9_-]{12,32}$/', $id);
}

function teleclip_cleanup(): void {
    $clips = glob(teleclip_data_dir() . '/clip-*.json') ?: [];
    $now = time();

    foreach ($clips as $file) {
        $raw = @file_get_contents($file);
        $item = $raw ? json_decode($raw, true) : null;
        if (!$item || (int) ($item['expiresAtUnix'] ?? 0) <= $now) {
            @unlink($file);
        }
    }
}

function teleclip_client_ip(): string {
    $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($forwarded) {
        return trim(explode(',', $forwarded)[0]);
    }
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

function teleclip_rate_limit(): void {
    $hash = hash('sha256', teleclip_client_ip());
    $file = teleclip_data_dir() . '/rate-' . $hash . '.json';
    $now = time();
    $entry = ['count' => 0, 'resetAt' => $now + TELECLIP_RATE_WINDOW_SECONDS];

    if (is_file($file)) {
        $raw = @file_get_contents($file);
        $loaded = $raw ? json_decode($raw, true) : null;
        if ($loaded && (int) ($loaded['resetAt'] ?? 0) > $now) {
            $entry = $loaded;
        }
    }

    $entry['count'] = ((int) $entry['count']) + 1;
    if ($entry['count'] > TELECLIP_RATE_MAX) {
        teleclip_json(['error' => 'Too many sends. Try again soon.'], 429);
    }

    file_put_contents($file, json_encode($entry), LOCK_EX);
}
