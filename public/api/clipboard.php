<?php
declare(strict_types=1);

require __DIR__ . '/shared.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    teleclip_json(['error' => 'Method not allowed.'], 405);
}

$id = (string) ($_GET['id'] ?? '');
if (!teleclip_valid_id($id)) {
    teleclip_json(['error' => 'This clip expired or does not exist.'], 404);
}

$file = teleclip_data_dir() . '/clip-' . $id . '.json';
if (!is_file($file)) {
    teleclip_json(['error' => 'This clip expired or does not exist.'], 404);
}

$raw = file_get_contents($file) ?: '';
$item = json_decode($raw, true);
if (!$item || (int) ($item['expiresAtUnix'] ?? 0) <= time()) {
    @unlink($file);
    teleclip_json(['error' => 'This clip expired or does not exist.'], 404);
}

teleclip_json([
    'id' => $item['id'],
    'text' => $item['text'],
    'expiresAt' => $item['expiresAt'],
]);
