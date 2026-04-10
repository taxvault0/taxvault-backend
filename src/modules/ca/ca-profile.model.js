// src/modules/ca/ca.controller.js
const CAProfile = require('./ca-profile.model');
const TaxCase = require('../tax/tax-case.model');

const normalizePhone = (v = '') => String(v).replace(/\D/g, '');

const normalizeLanguages = (languages = []) => {
  if (!Array.isArray(languages)) return [];
  return [...new Set(languages.map((l) => String(l).toLowerCase().trim()))];
};

exports.createOrUpdateProfile = async (req, res) => {
  try {
    const data = req.body || {};

    const update = {
      user: req.user._id,
      updatedAt: new Date()
    };

    // Basic fields
    if (data.firmName !== undefined) update.firmName = data.firmName;
    if (data.bio !== undefined) update.bio = data.bio;

    if (data.yearsOfExperience !== undefined) {
      update.yearsOfExperience = Number(data.yearsOfExperience) || 0;
    }

    // Address
    if (data.address) {
      update.address = {
        street: data.address.street || '',
        city: data.address.city || '',
        province: data.address.province || '',
        postalCode: data.address.postalCode || '',
        country: data.address.country || 'Canada'
      };
    }

    // Location
    if (data.location?.coordinates) {
      update.location = {
        type: 'Point',
        coordinates: data.location.coordinates
      };
    }

    if (data.serviceRadius !== undefined) {
      update.serviceRadius = Number(data.serviceRadius) || 50;
    }

    // Availability
    if (data.acceptingNewClients !== undefined) {
      update.acceptingNewClients = data.acceptingNewClients;
      update.availabilityStatus = data.acceptingNewClients
        ? 'active'
        : 'not-accepting';
    }

    if (Array.isArray(data.availableFor)) {
      update.availableFor = data.availableFor;
    }

    // Specializations / services
    if (Array.isArray(data.specializations)) {
      update.specializations = data.specializations;
    }

    if (Array.isArray(data.services)) {
      update.services = data.services;
    }

    // Languages
    if (data.languages) {
      update.languages = normalizeLanguages(data.languages);
    }

    if (data.otherLanguage !== undefined) {
      update.otherLanguage = data.otherLanguage;
    }

    // Contact
    if (data.phone !== undefined) update.phone = normalizePhone(data.phone);
    if (data.alternatePhone !== undefined)
      update.alternatePhone = normalizePhone(data.alternatePhone);
    if (data.firmPhone !== undefined)
      update.firmPhone = normalizePhone(data.firmPhone);

    if (data.website !== undefined) update.website = data.website;

    // Professional
    if (data.licenseNumber !== undefined)
      update.licenseNumber = data.licenseNumber;

    if (data.policyNumber !== undefined)
      update.policyNumber = data.policyNumber;

    if (data.yearAdmitted !== undefined) {
      update.yearAdmitted = Number(data.yearAdmitted);
    }

    if (data.peerReviewDate !== undefined) {
      update.peerReviewDate = data.peerReviewDate;
    }

    // Hours
    if (data.hoursOfOperation) {
      update.hoursOfOperation = data.hoursOfOperation;
    }

    const profile = await CAProfile.findOneAndUpdate(
      { user: req.user._id },
      { $set: update },
      { new: true, upsert: true }
    ).populate('user', 'name email');

    return res.json({
      success: true,
      message: 'Profile saved',
      profile
    });
  } catch (error) {
    console.error('createOrUpdateProfile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save profile'
    });
  }
};

exports.toggleAcceptingStatus = async (req, res) => {
  try {
    const profile = await CAProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    profile.acceptingNewClients = !profile.acceptingNewClients;
    profile.availabilityStatus = profile.acceptingNewClients
      ? 'active'
      : 'not-accepting';

    await profile.save();

    return res.json({
      success: true,
      acceptingNewClients: profile.acceptingNewClients,
      availabilityStatus: profile.availabilityStatus
    });
  } catch (error) {
    console.error('toggleAcceptingStatus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle status'
    });
  }
};

exports.getCADashboardStats = async (req, res) => {
  try {
    const profile = await CAProfile.findOne({ user: req.user._id }).lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const [totalCases, activeCases] = await Promise.all([
      TaxCase.countDocuments({ ca: req.user._id }),
      TaxCase.countDocuments({
        ca: req.user._id,
        status: { $in: ['assigned', 'in-progress'] }
      })
    ]);

    return res.json({
      success: true,
      stats: {
        profileViews: profile.profileViews || 0,
        connectionRequests: profile.connectionRequests || 0,
        rating: profile.rating || 0,
        reviewCount: profile.reviewCount || 0,
        totalCases,
        activeCases
      }
    });
  } catch (error) {
    console.error('getCADashboardStats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch stats'
    });
  }
};

exports.requestConnection = async (req, res) => {
  try {
    const { caProfileId } = req.body;

    const profile = await CAProfile.findById(caProfileId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'CA not found'
      });
    }

    // Just increment count (schema only supports counter)
    profile.connectionRequests += 1;
    await profile.save();

    return res.json({
      success: true,
      message: 'Connection request sent'
    });
  } catch (error) {
    console.error('requestConnection error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send request'
    });
  }
};

exports.respondToConnectionRequest = async (req, res) => {
  try {
    // Not implemented since schema doesn't store request objects
    return res.json({
      success: true,
      message: 'Connection response recorded (no-op)'
    });
  } catch (error) {
    console.error('respondToConnectionRequest error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to respond'
    });
  }
};