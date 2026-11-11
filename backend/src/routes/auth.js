const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'user',
      licenseNumber,
      specialty,
      affiliation,
      referralCode
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'An account with this email already exists' });

    const hashed = await bcrypt.hash(password, 12);

    let assignedClinicianId = null;
    let clinicianCode = null;

    if (role === 'clinician') {
      if (!licenseNumber || !licenseNumber.trim()) {
        return res.status(400).json({ message: 'Clinician medical license or registration ID is required' });
      }
      // Generate clean unique clinician connect code: DR-[NAME]-[3_DIGITS]
      const cleanName = name.replace(/^(dr\.?|doctor)\s+/i, '').trim().split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '') || 'PROV';
      let codeAttempt = `DR-${cleanName}-${Math.floor(100 + Math.random() * 900)}`;
      let codeExists = await User.findOne({ clinicianCode: codeAttempt });
      while (codeExists) {
        codeAttempt = `DR-${cleanName}-${Math.floor(100 + Math.random() * 900)}`;
        codeExists = await User.findOne({ clinicianCode: codeAttempt });
      }
      clinicianCode = codeAttempt;

      const user = await User.create({
        name,
        email,
        password: hashed,
        role: 'clinician',
        licenseNumber: licenseNumber.trim(),
        specialty: (specialty && specialty.trim()) || 'Clinical Psychology',
        affiliation: (affiliation && affiliation.trim()) || 'Private Practice',
        clinicianCode
      });

      return res.status(201).json({
        message: 'Clinician account created successfully',
        userId: user._id,
        role: 'clinician',
        clinicianCode
      });
    }

    // Role is 'user' (Individual Patient)
    if (referralCode && referralCode.trim()) {
      const clinician = await User.findOne({
        clinicianCode: referralCode.trim().toUpperCase(),
        role: 'clinician'
      });
      if (clinician) {
        assignedClinicianId = clinician._id;
      }
    }

    const user = await User.create({
      name,
      email,
      password: hashed,
      role: 'user',
      assignedClinicianId
    });

    res.status(201).json({
      message: 'Account created successfully',
      userId: user._id,
      role: 'user',
      linkedClinician: assignedClinicianId ? true : false
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        clinicianCode: user.clinicianCode,
        specialty: user.specialty,
        affiliation: user.affiliation,
        assignedClinicianId: user.assignedClinicianId
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login' });
  }
});

module.exports = router;
