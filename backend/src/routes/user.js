const router = require('express').Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Assessment = require('../models/Assessment');

// GET /api/user/profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('assignedClinicianId', 'name email specialty affiliation clinicianCode');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// POST /api/user/link-clinician
router.post('/link-clinician', auth, async (req, res) => {
  try {
    const { clinicianCode } = req.body;
    if (!clinicianCode || !clinicianCode.trim()) {
      return res.status(400).json({ message: 'Clinician referral connect code is required' });
    }

    const clinician = await User.findOne({
      clinicianCode: clinicianCode.trim().toUpperCase(),
      role: 'clinician'
    }).select('-password');

    if (!clinician) {
      return res.status(404).json({ message: 'No clinician found matching this connect code' });
    }

    if (clinician._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: 'You cannot link to your own clinician code' });
    }

    await User.findByIdAndUpdate(req.user.id, { assignedClinicianId: clinician._id });
    // Also associate user's past assessments with this clinician
    await Assessment.updateMany({ userId: req.user.id }, { clinicianId: clinician._id });

    res.json({
      message: `Successfully connected with ${clinician.name}`,
      clinician: {
        id: clinician._id,
        name: clinician.name,
        specialty: clinician.specialty,
        affiliation: clinician.affiliation,
        code: clinician.clinicianCode
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to link clinician' });
  }
});

// PUT /api/user/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Name is required' });
    const user = await User.findByIdAndUpdate(req.user.id, { name: name.trim() }, { new: true }).select('-password');
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch {
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// PUT /api/user/password
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch {
    res.status(500).json({ message: 'Failed to update password' });
  }
});

// DELETE /api/user
router.delete('/', auth, async (req, res) => {
  try {
    await Assessment.deleteMany({ userId: req.user.id });
    await User.findByIdAndDelete(req.user.id);
    res.json({ message: 'Account deleted successfully' });
  } catch {
    res.status(500).json({ message: 'Failed to delete account' });
  }
});

module.exports = router;
