<?php
declare(strict_types=1);

require __DIR__ . '/shared.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    teleclip_json(['error' => 'Method not allowed.'], 405);
}

teleclip_cleanup();
teleclip_rate_limit();

$raw = file_get_contents('php://input') ?: '';
$body = json_decode($raw, true);
$text = trim((string) ($body['text'] ?? ''));

if ($text === '') {
    teleclip_json(['error' => 'Text is required.'], 400);
}

$now = time();
$id = teleclip_id();
$item = [
    'id' => $id,
    'text' => $text,
    'createdAt' => gmdate('c', $now),
    'expiresAt' => gmdate('c', $now + TELECLIP_TTL_SECONDS),
    'expiresAtUnix' => $now + TELECLIP_TTL_SECONDS,
];

$file = teleclip_data_dir() . '/clip-' . $id . '.json';
file_put_contents($file, json_encode($item, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX);
@chmod($file, 0600);

teleclip_json([
    'id' => $id,
    'url' => teleclip_public_url() . '/c/' . $id,
    'preview' => $text,
    'expiresAt' => $item['expiresAt'],
], 201);
