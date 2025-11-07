<?php
// Bridge PHP simples (simula download de XSDs e proxy)
if (strpos(['REQUEST_URI'], 'xsd_fetch.php') !== false) {
    echo 'Baixando XSDs simuladamente (reforma 2025)...';
    exit;
}
if (strpos(['REQUEST_URI'], 'emit_forward.php') !== false) {
    echo 'Encaminhando emissão simulada para mock SEFAZ...';
    exit;
}
echo '<h2>Bridge Emissor NF-e 2025</h2><p>Use /xsd_fetch.php ou /emit_forward.php</p>';
?>
