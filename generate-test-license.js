/**
 * Local test license key generator.
 * Run: node generate-test-license.js
 * Then copy the output into your .env and use the licenseKey to activate.
 *
 * NOT for production — private key is generated fresh each run.
 */

const { generateKeyPairSync } = require('crypto');
const jwt = require('jsonwebtoken');

const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// Edit these fields to match what you want to test
const payload = {
  tier: 'professional',       // community | professional | enterprise | cloud
  licensee: 'Test User',
  email: 'test@example.com',
  company: 'Test Corp',
  maxUsers: null,             // null = unlimited
  maxProjects: null,
  features: [],               // server derives features from tier; leave empty
  trial: false,
  iss: 'turneratech.com',
  jti: `test-${Date.now()}`
};

const licenseKey = jwt.sign(payload, privateKey, {
  algorithm: 'ES256',
  expiresIn: '365d'
});

console.log('\n=== TEST LICENSE GENERATOR ===\n');
console.log('Add this to your .env:\n');
console.log(`LICENSE_PUBLIC_KEY="${publicKey.replace(/\n/g, '\\n')}"`);
console.log('\n--- OR use the multiline form ---\n');
console.log('LICENSE_PUBLIC_KEY=');
console.log(publicKey);

console.log('\n=== LICENSE KEY (use this to activate) ===\n');
console.log(licenseKey);
console.log('\n=== ACTIVATE COMMAND ===\n');
console.log(`curl -X POST http://localhost:5045/api/license/activate \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "Authorization: Bearer <admin-jwt>" \\`);
console.log(`  -d '{"licenseKey":"${licenseKey}"}'`);
console.log('\n');
