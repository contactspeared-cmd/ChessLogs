<?php

require_once __DIR__ . '/../api/config/db.php';

echo "=== ChessLogs MySQL Migration Runner ===\n";

try {
    $pdo = getDbConnection();
    $sqlPath = __DIR__ . '/schema.sql';

    if (!file_exists($sqlPath)) {
        throw new Exception("Schema file not found at: $sqlPath");
    }

    echo "Reading schema from: $sqlPath\n";
    $sql = file_get_contents($sqlPath);

    $pdo->exec($sql);

    echo "Schema successfully migrated and tables initialized!\n";

    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Existing tables in 'chesslogs':\n";
    foreach ($tables as $t) {
        echo "  - $t\n";
    }

    $adminStmt = $pdo->query("SELECT id, email, display_name, role FROM profiles WHERE role = 'admin' LIMIT 1");
    $admin = $adminStmt->fetch();
    if ($admin) {
        echo "\nAdmin Account Seeded:\n";
        echo "  Email: " . $admin['email'] . "\n";
        echo "  Name:  " . $admin['display_name'] . "\n";
        echo "  Role:  " . $admin['role'] . "\n";
    }

    echo "\n=== Migration Complete ===\n";
} catch (\Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
