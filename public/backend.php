<?php

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require '../vendor/autoload.php';

use SWeb3\SWeb3;
use SWeb3\SWeb3_Contract;
use SWeb3\Utils;
use Dotenv\Dotenv;

const CONTRACT_ADDRESS = '0xF988A1b6d4C00832ed3570a4e50DdA4357a22F7D';
const RPC_URL = 'https://rpc.chiadochain.net';
const chainId = 10200; // Chiado chain ID

$dotenv = Dotenv::createImmutable(dirname(__DIR__));
$dotenv->load();

// Read the JSON payload from the request body
$requestBody = file_get_contents('php://input');
$data = json_decode($requestBody, true);

// Validate and extract parameters
if (isset($data['from'], $data['amount'], $data['deadline'], $data['v'], $data['r'], $data['s'])) {
    $from = $data['from'];
    $amount = $data['amount'];
    $deadline = $data['deadline'];
    $v = $data['v'];
    $r = $data['r'];
    $s = $data['s'];

    $sweb3 = new SWeb3(RPC_URL);
    $sweb3->chainId = chainId;
    $sweb3->setPersonalData($_ENV['SIGNER_ADDRESS'], $_ENV['SIGNER_PRIVATE_KEY']);

    $abi = json_encode(json_decode(file_get_contents("../CQMToken.json"))->abi);
    $contract = new SWeb3_contract($sweb3, CONTRACT_ADDRESS, $abi);

    $ownerResult = $contract->call('owner');
    $owner = $ownerResult->result;

    $extra_data = ['nonce' => $sweb3->personal->getNonce()];
    $result = $contract->send('metaTransfer', [$from, $owner, $amount, $deadline, $v, $r, $s], $extra_data);

    http_response_code(200);
    $response = [
        'status' => 'ok',
        'message' => 'OK'
    ];
} else {
    // Handle missing or invalid parameters
    http_response_code(400);
    $response = [
        'status' => 'error',
        'message' => 'Invalid or missing parameters'
    ];
}

// Send the JSON response
header('Content-Type: application/json');
echo json_encode($response);
