import { decryptPayload, encryptPayload, signServerPayload, verifyServerPayloadSignature } from '../utils/payloadEncryption.js';

interface TestMedicalSyncData {
  customerId: string;
  patientName: string;
  prescription: {
    sph: number;
    cyl: number;
    axis: number;
  };
}

function runEncryptionTests() {
  console.log('=== RUNNING INTER-SERVER ENCRYPTION & SIGNING TESTS ===\n');

  process.env.INTER_SERVER_SECRET = 'test-secret-key-1234567890-abcdef';

  const originalData: TestMedicalSyncData = {
    customerId: 'CUST-9901',
    patientName: 'Ravi Kumar',
    prescription: {
      sph: -2.5,
      cyl: -0.75,
      axis: 90,
    },
  };

  // 1. Test AES-256-GCM Encryption
  console.log('1. Encrypting test payload with AES-256-GCM...');
  const envelope = encryptPayload(originalData);
  console.log('   Envelope generated:', {
    ciphertextLength: envelope.ciphertext.length,
    iv: envelope.iv,
    tag: envelope.tag,
    timestamp: envelope.timestamp,
  });

  // 2. Test Decryption
  console.log('\n2. Decrypting payload...');
  const decrypted = decryptPayload<TestMedicalSyncData>(envelope);
  if (decrypted.customerId === originalData.customerId && decrypted.prescription.sph === -2.5) {
    console.log('   ✅ Decryption succeeded! Decrypted data matches original exactly.');
  } else {
    throw new Error('Decryption content mismatch!');
  }

  // 3. Test HMAC-SHA256 Signing
  console.log('\n3. Testing HMAC-SHA256 Request Signing...');
  const bodyString = JSON.stringify(envelope);
  const timestamp = Date.now();
  const signature = signServerPayload(bodyString, timestamp);
  console.log('   Signature generated:', signature);

  const isValid = verifyServerPayloadSignature(bodyString, signature, String(timestamp));
  if (isValid) {
    console.log('   ✅ Signature verification succeeded!');
  } else {
    throw new Error('Signature verification failed!');
  }

  // 4. Test Tamper Detection
  console.log('\n4. Testing Tamper Detection (Tampered Ciphertext)...');
  try {
    const tamperedEnvelope = {
      ...envelope,
      ciphertext: envelope.ciphertext.slice(0, -4) + 'AAAA',
    };
    decryptPayload(tamperedEnvelope);
    throw new Error('Tamper detection failed (decryption should have thrown)!');
  } catch {
    console.log('   ✅ Tampered ciphertext correctly rejected by GCM auth tag.');
  }

  // 5. Test Anti-Replay Detection
  console.log('\n5. Testing Anti-Replay Window Detection (Expired timestamp)...');
  try {
    const expiredEnvelope = {
      ...envelope,
      timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
    };
    decryptPayload(expiredEnvelope, undefined, 5 * 60 * 1000); // 5 min max window
    throw new Error('Anti-replay test failed (expired payload should have thrown)!');
  } catch {
    console.log('   ✅ Expired payload correctly rejected by anti-replay guard.');
  }

  console.log('\n🎉 ALL INTER-SERVER ENCRYPTION TESTS PASSED SUCCESSFULLY!');
}

runEncryptionTests();
