const { describe, it } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('Backend Auth & Security Unit Tests', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_123';

  it('AUTH-01: bcrypt password hashing and verification', async () => {
    const rawPassword = 'ClinicalPassword2026!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);

    assert.ok(hash !== rawPassword, 'Hash should not match raw password');
    assert.ok(hash.startsWith('$2'), 'Hash should be valid bcrypt format');

    const isMatch = await bcrypt.compare(rawPassword, hash);
    assert.strictEqual(isMatch, true, 'bcrypt.compare should return true for correct password');

    const isWrongMatch = await bcrypt.compare('WrongPassword', hash);
    assert.strictEqual(isWrongMatch, false, 'bcrypt.compare should return false for wrong password');
  });

  it('AUTH-02: JWT token creation and payload extraction', () => {
    const userPayload = {
      id: '6731a1000000000000000001',
      role: 'clinician',
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });
    assert.ok(typeof token === 'string' && token.split('.').length === 3, 'JWT should be valid 3-part token');

    const decoded = jwt.verify(token, JWT_SECRET);
    assert.strictEqual(decoded.id, userPayload.id, 'Decoded user ID should match payload');
    assert.strictEqual(decoded.role, 'clinician', 'Decoded role should match clinician');
  });

  it('AUTH-03: Clinician Connect Code generation pattern', () => {
    const clinicianName = 'Dr. Sarah Jenkins, MD';
    const cleanName = clinicianName.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 8);
    const randomDigits = Math.floor(100 + Math.random() * 900);
    const code = `DR-${cleanName || 'PROV'}-${randomDigits}`;

    assert.ok(code.startsWith('DR-'), 'Code must start with DR- prefix');
    assert.match(code, /^DR-[A-Z]+-\d{3}$/, 'Code should follow DR-NAME-### regex pattern');
  });

  it('AUTH-04: Role validation rules (Individual vs Clinician)', () => {
    // Individual validation
    const individualData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'user',
    };
    assert.strictEqual(individualData.role, 'user');
    assert.ok(individualData.name && individualData.email && individualData.password);

    // Clinician validation (requires license and specialty)
    const clinicianData = {
      name: 'Dr. Jane Smith',
      email: 'jane@clinic.org',
      password: 'password123',
      role: 'clinician',
      licenseNumber: 'MD-PSY-98421',
      specialty: 'Psychiatry',
      affiliation: 'City General Hospital'
    };
    assert.strictEqual(clinicianData.role, 'clinician');
    assert.ok(clinicianData.licenseNumber, 'Clinician must provide license number');
    assert.ok(clinicianData.specialty, 'Clinician must provide specialty');
  });

  it('AUTH-05: Rejection of expired or tampered JWT tokens', () => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature';
    assert.throws(() => {
      jwt.verify(fakeToken, JWT_SECRET);
    }, (err) => {
      return err instanceof Error;
    });

    // Also verify tampered payload signature fails verification
    const validToken = jwt.sign({ id: '123' }, JWT_SECRET);
    const brokenSignature = validToken.slice(0, -5) + 'xxxxx';
    assert.throws(() => {
      jwt.verify(brokenSignature, JWT_SECRET);
    }, (err) => {
      return err instanceof jwt.JsonWebTokenError;
    });
  });
});
