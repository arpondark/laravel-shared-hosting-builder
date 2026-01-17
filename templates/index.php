<?php

define('LARAVEL_START', microtime(true));

if (file_exists(__DIR__ . '/laravel/storage/framework/maintenance.php')) {
    require __DIR__ . '/laravel/storage/framework/maintenance.php';
}

require __DIR__ . '/laravel/vendor/autoload.php';

$app = require_once __DIR__ . '/laravel/bootstrap/app.php';

$app->bind('request', function () {
    return Illuminate\Http\Request::capture();
});

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

$response->send();

$kernel->terminate($request, $response);
