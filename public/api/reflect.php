<?php
declare(strict_types=1);

require __DIR__ . '/shared.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    teleclip_json(teleclip_read_reflect());
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    teleclip_rate_limit();
    $state = ['current' => null, 'history' => []];
    teleclip_write_reflect($state);
    teleclip_json($state);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    teleclip_json(['error' => 'Method not allowed.'], 405);
}

teleclip_rate_limit();

$raw = file_get_contents('php://input') ?: '';
$body = json_decode($raw, true);
$text = trim((string) ($body['text'] ?? ''));

if ($text === '') {
    teleclip_json(['error' => 'Text is required.'], 400);
}

$state = teleclip_read_reflect();
$now = gmdate('c');
$item = [
    'id' => teleclip_id(),
    'text' => $text,
    'createdAt' => $now,
];

$history = $state['history'];
$history = array_values(array_filter($history, function ($entry) use ($item) {
    return ($entry['id'] ?? '') !== $item['id'];
}));
array_unshift($history, $item);
$history = array_values(array_slice($history, 0, TELECLIP_HISTORY_LIMIT));

$next = [
    'current' => $item,
    'history' => $history,
];

teleclip_write_reflect($next);
teleclip_json($next, 201);
