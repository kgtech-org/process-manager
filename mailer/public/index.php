<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailException;

require __DIR__ . '/../vendor/autoload.php';

// Load .env if present
// if (file_exists(__DIR__ . '/../.env')) {
//     Dotenv\Dotenv::createImmutable(dirname(__DIR__))->load();
// }

header('Content-Type: application/json');

// Health endpoint
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET' && ($_SERVER['REQUEST_URI'] ?? '/') === '/health') {
    echo json_encode(['status' => 'ok']);
    exit;
}

// Simple routing for POST /send
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

if ($method !== 'POST' || $path !== '/send') {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Not found']);
    exit;
}

// API key check (optional)
// $expectedKey = $_ENV['MAILER_API_KEY'] ?? getenv('MAILER_API_KEY') ?: '';
// $providedKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
// if ($expectedKey !== '' && $expectedKey !== $providedKey) {
//     http_response_code(401);
//     echo json_encode(['success' => false, 'message' => 'Unauthorized']);
//     exit;
// }

$input = json_decode(file_get_contents('php://input') ?: '{}', true) ?: [];

// Validate payload
$to = $input['to'] ?? [];
$subject = (string)($input['subject'] ?? '');
$html = (string)($input['html'] ?? '');
$text = (string)($input['text'] ?? '');

if (!is_array($to) || empty($to) || $subject === '' || $html === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid payload']);
    exit;
}

try {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = 'smtp.hostinger.com';
    $mail->Port = 465;
    $mail->SMTPAuth = true;
    $mail->Username = 'admin@k-j.store';
    $mail->Password = '0n3@L1f3@';
    $mail->SMTPSecure = ($mail->Port === 465) ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
    $mail->CharSet = 'UTF-8';

    $fromEmail = 'Process Manager <admin@k-j.store>';
    $fromName = 'Yas Process';
    $mail->setFrom($fromEmail, $fromName);

    foreach ($to as $recipient) {
        $email = $recipient['email'] ?? '';
        $name = $recipient['name'] ?? '';
        if ($email !== '') {
            $mail->addAddress($email, $name);
        }
    }

    $mail->Subject = $subject;
    $mail->isHTML(true);
    $mail->Body = $html;
    if ($text !== '') {
        $mail->AltBody = $text;
    }

    $mail->send();
    echo json_encode(['success' => true, 'message' => 'Email sent']);
} catch (MailException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Send failed', 'error' => $e->getMessage()]);
}


