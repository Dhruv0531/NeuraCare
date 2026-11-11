const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'clinician'], default: 'user' },
  // Clinician profile details
  licenseNumber: { type: String, trim: true },
  specialty: { type: String, trim: true },
  affiliation: { type: String, trim: true },
  clinicianCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
  // Patient clinical linkage
  assignedClinicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

