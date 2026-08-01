<?php
declare(strict_types=1);

require __DIR__ . '/shared.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    teleclip_json(['error' => 'Method not allowed.'], 405);
}

teleclip_rate_limit();

$id = (string) ($_GET['id'] ?? '');
if ($id === '') {
    teleclip_json(['error' => 'History item is required.'], 400);
}

$state = teleclip_without_history_item(teleclip_read_reflect(), $id);
teleclip_write_reflect($state);
teleclip_json($state);
