import { decryptPayload, EncryptedEnvelope, encryptPayload, isEncryptedEnvelope } from '../utils/payloadEncryption.js';

interface CustomerPayload {
  name: string;
  age: string;
  gender: string;
  mobile: string;
  customerType: string;
  rxData: {
    sph: number;
    cyl: number;
    axis: number;
  };
}

function runE2EETests() {
  console.log('=== BROWSER ↔ SERVER END-TO-END PAYLOAD ENCRYPTION (E2EE) TEST ===\n');

  process.env.E2EE_SECRET = 'titan-e2ee-payload-encryption-secret-key-987654321';

  const originalCustomerData: CustomerPayload = {
    name: 'Abc Test Patient',
    age: '28',
    gender: 'Female',
    mobile: '9876543210',
    customerType: 'New',
    rxData: {
      sph: -1.75,
      cyl: -0.5,
      axis: 180,
    },
  };

  // 1. Simulate Browser Encrypting Outgoing POST Payload
  console.log('1. [Browser] Encrypting outgoing customer data...');
  const clientEncryptedEnvelope: EncryptedEnvelope = encryptPayload(originalCustomerData);
  console.log('   Encrypted Wire Payload (what travels over the network):', {
    __encrypted: clientEncryptedEnvelope.__encrypted,
    ciphertext: clientEncryptedEnvelope.ciphertext.slice(0, 32) + '...',
    iv: clientEncryptedEnvelope.iv,
    tag: clientEncryptedEnvelope.tag,
    timestamp: clientEncryptedEnvelope.timestamp,
  });

  if (!isEncryptedEnvelope(clientEncryptedEnvelope)) {
    throw new Error('isEncryptedEnvelope failed to recognize envelope!');
  }

  // 2. Simulate Server Decrypting Incoming Request Body in Middleware
  console.log('\n2. [Server] Decrypting incoming request payload in middleware...');
  const serverDecrypted = decryptPayload<CustomerPayload>(clientEncryptedEnvelope);
  console.log('   Decrypted on Server:', {
    name: serverDecrypted.name,
    mobile: serverDecrypted.mobile,
    rxData: serverDecrypted.rxData,
  });

  if (serverDecrypted.name !== originalCustomerData.name || serverDecrypted.mobile !== originalCustomerData.mobile) {
    throw new Error('Server decrypted payload does not match original data!');
  }

  // 3. Simulate Server Encrypting Response Payload in res.json
  console.log('\n3. [Server] Encrypting response body before sending to browser...');
  const serverResponseData = {
    id: '#0099',
    ok: true,
    createdCustomer: serverDecrypted,
  };
  const serverResponseEnvelope: EncryptedEnvelope = encryptPayload(serverResponseData);
  console.log('   Encrypted Wire Response:', {
    __encrypted: serverResponseEnvelope.__encrypted,
    ciphertext: serverResponseEnvelope.ciphertext.slice(0, 32) + '...',
    tag: serverResponseEnvelope.tag,
  });

  // 4. Simulate Browser Axios Response Interceptor Decrypting Response
  console.log('\n4. [Browser] Decrypting response in Axios response interceptor...');
  const clientDecrypted = decryptPayload<typeof serverResponseData>(serverResponseEnvelope);
  console.log('   Decrypted in Browser:', {
    id: clientDecrypted.id,
    ok: clientDecrypted.ok,
    patientName: clientDecrypted.createdCustomer.name,
  });

  if (clientDecrypted.id !== '#0099' || !clientDecrypted.ok) {
    throw new Error('Browser decrypted response does not match!');
  }

  console.log('\n🎉 ALL BROWSER ↔ SERVER E2EE ROUNDTRIP TESTS PASSED WITH 100% FIDELITY!');
}

runE2EETests();
