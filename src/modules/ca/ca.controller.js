// src/modules/ca/ca.controller.js
const mongoose = require('mongoose');
const CAProfile = require('./ca-profile.model');
const TaxCase = require('../tax/tax-case.model');

const normalizePhone = (value = '') => String(value).replace(/\D/g, '');

const normalizeLanguage = (value = '') => {
  const normalized = String(value).trim().toLowerCase();

  const languageMap = {
    english: 'english',
    french: 'french',
    spanish: 'spanish',
    mandarin: 'mandarin',
    cantonese: 'cantonese',
    punjabi: 'punjabi',
    arabic: 'arabic',
    hindi: 'hindi',
    'persian (farsi)': 'persian',
    persian: 'persian',
    farsi: 'persian',
    'tagalog (filipino)': 'tagalog',
    tagalog: 'tagalog',
    filipino: 'tagalog',
    other: 'other'
  };

  return languageMap[normalized] || normalized;
};

const normalizeLanguages = (languages = []) => {
  if (!Array.isArray(languages)) return [];
  return [...new Set(languages.map(normalizeLanguage).filter(Boolean))];
};

const normalizeAvailableFor = (value) => {
  if (!value) return [];
  if (!Array.isArray(value)) value = [value];

  const allowed = new Set(['individual', 'business', 'self-employed', 'corporate', 'all']);

  const normalized = value
    .map((item) => String(item).trim().toLowerCase())
    .filter((item) => allowed.has(item));

  return [...new Set(normalized)];
};

const normalizeCoordinates = (location) => {
  if (!location || typeof location !== 'object') return undefined;

  if (
    Array.isArray(location.coordinates) &&
    location.coordinates.length === 2 &&
    !Number.isNaN(Number(location.coordinates[0])) &&
    !Number.isNaN(Number(location.coordinates[1]))
  ) {
    return {
      type: 'Point',
      coordinates: [Number(location.coordinates[0]), Number(location.coordinates[1])]
    };
  }

  if (
    location.lng !== undefined &&
    location.lat !== undefined &&
    !Number.isNaN(Number(location.lng)) &&
    !Number.isNaN(Number(location.lat))
  ) {
    return {
      type: 'Point',
      coordinates: [Number(location.lng), Number(location.lat)]
    };
  }

  return undefined;
};

exports.createOrUpdateProfile = async (req, res) => {
  try {
    const {
      firmName,
      bio,
      yearsOfExperience,
      address,
      serviceRadius,
      specializations,
      services,
      languages,
      otherLanguage,
      phone,
      alternatePhone,
      firmPhone,
      website,
      availableFor,
      hoursOfOperation,
      location,
      yearAdmitted,
      licenseNumber,
      policyNumber,
      peerReviewDate
    } = req.body || {};

    const update = {
      user: req.user._id,
      updatedAt: new Date()
    };

    if (firmName !== undefined) update.firmName = String(firmName).trim();
    if (bio !== undefined) update.bio = String(bio).trim();

    if (yearsOfExperience !== undefined && yearsOfExperience !== null && yearsOfExperience !== '') {
      update.yearsOfExperience = Number(yearsOfExperience);
    }

    if (serviceRadius !== undefined && serviceRadius !== null && serviceRadius !== '') {
      update.serviceRadius = Number(serviceRadius);
    }

    if (Array.isArray(specializations)) update.specializations = specializations;
    if (Array.isArray(services)) update.services = services;

    if (languages !== undefined) update.languages = normalizeLanguages(languages);
    if (otherLanguage !== undefined) update.otherLanguage = String(otherLanguage || '').trim();

    if (phone !== undefined) update.phone = normalizePhone(phone);
    if (alternatePhone !== undefined) update.alternatePhone = normalizePhone(alternatePhone);
    if (firmPhone !== undefined) update.firmPhone = normalizePhone(firmPhone);

    if (website !== undefined) update.website = String(website || '').trim();

    if (availableFor !== undefined) {
      update.availableFor = normalizeAvailableFor(availableFor);
    }

    if (hoursOfOperation !== undefined && hoursOfOperation && typeof hoursOfOperation === 'object') {
      update.hoursOfOperation = hoursOfOperation;
    }

    if (address && typeof address === 'object') {
      update.address = {
        street: address.street || '',
        city: address.city || '',
        province: address.province || '',
        postalCode: address.postalCode || '',
        country: address.country || 'Canada'
      };
    }

    const normalizedLocation = normalizeCoordinates(location);
    if (normalizedLocation) {
      update.location = normalizedLocation;
    }

    if (yearAdmitted !== undefined && yearAdmitted !== null && yearAdmitted !== '') {
      update.yearAdmitted = Number(yearAdmitted);
    }

    if (licenseNumber !== undefined) update.licenseNumber = String(licenseNumber || '').trim();
    if (policyNumber !== undefined) update.policyNumber = String(policyNumber || '').trim();
    if (peerReviewDate !== undefined) update.peerReviewDate = peerReviewDate || null;

    const profile = await CAProfile.findOneAndUpdate(
      { user: req.user._id },
      { $set: update },
      { new: true, upsert: true, runValidators: false }
    ).populate('user', 'name email');

    return res.json({
      success: true,
      message: 'CA profile saved successfully',
      profile
    });
  } catch (error) {
    console.error('createOrUpdateProfile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save CA profile'
    });
  }
};

exports.toggleAcceptingStatus = async (req, res) => {
  try {
    const profile = await CAProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'CA profile not found'
      });
    }

    profile.acceptingNewClients = !profile.acceptingNewClients;
    profile.availabilityStatus = profile.acceptingNewClients ? 'active' : 'not-accepting';
    profile.updatedAt = new Date();

    await profile.save();

    return res.json({
      success: true,
      message: 'Availability status updated successfully',
      acceptingNewClients: profile.acceptingNewClients,
      availabilityStatus: profile.availabilityStatus
    });
  } catch (error) {
    console.error('toggleAcceptingStatus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update availability status'
    });
  }
};

exports.getCADashboardStats = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    const [profile, totalCases, activeCases, completedCases] = await Promise.all([
      CAProfile.findOne({ user: req.user._id }).lean(),
      TaxCase.countDocuments({ ca: req.user._id }),
      TaxCase.countDocuments({
        ca: req.user._id,
        status: { $in: ['assigned', 'in-progress', 'under-review', 'pending-documents'] }
      }),
      TaxCase.countDocuments({
        ca: req.user._id,
        status: { $in: ['completed', 'filed', 'closed'] }
      })
    ]);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'CA profile not found'
      });
    }

    const currentYearCases = await TaxCase.countDocuments({
      ca: req.user._id,
      taxYear: currentYear
    });

    return res.json({
      success: true,
      stats: {
        profileViews: profile.profileViews || 0,
        connectionRequests: profile.connectionRequests || 0,
        rating: profile.rating || 0,
        reviewCount: profile.reviewCount || 0,
        acceptingNewClients: Boolean(profile.acceptingNewClients),
        availabilityStatus: profile.availabilityStatus || 'inactive',
        totalCases,
        activeCases,
        completedCases,
        currentYearCases
      }
    });
  } catch (error) {
    console.error('getCADashboardStats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch CA dashboard stats'
    });
  }
};

exports.requestConnection = async (req, res) => {
  try {
    const { caProfileId, caId, message } = req.body || {};

    const targetId = caProfileId || caId;

    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid CA profile ID is required'
      });
    }

    const profile = await CAProfile.findById(targetId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'CA profile not found'
      });
    }

    const existingRequest = (profile.connectionRequestItems || []).find(
      (item) => String(item.user || item.client || item.requestedBy) === String(req.user._id) &&
        ['pending', 'accepted'].includes(String(item.status || '').toLowerCase())
    );

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'A connection request already exists for this CA'
      });
    }

    const nextRequest = {
      user: req.user._id,
      message: String(message || '').trim(),
      status: 'pending',
      requestedAt: new Date()
    };

    if (!Array.isArray(profile.connectionRequestItems)) {
      profile.connectionRequestItems = [];
    }

    profile.connectionRequestItems.push(nextRequest);
    profile.connectionRequests = (profile.connectionRequests || 0) + 1;
    profile.updatedAt = new Date();

    await profile.save();

    const createdRequest =
      profile.connectionRequestItems[profile.connectionRequestItems.length - 1] || null;

    return res.status(201).json({
      success: true,
      message: 'Connection request sent successfully',
      connectionRequest: createdRequest
    });
  } catch (error) {
    console.error('requestConnection error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send connection request'
    });
  }
};

exports.respondToConnectionRequest = async (req, res) => {
  try {
    const { status } = req.body || {};

    if (!['accepted', 'rejected'].includes(String(status || '').toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either accepted or rejected'
      });
    }

    const profile = await CAProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'CA profile not found'
      });
    }

    const requestItem = (profile.connectionRequestItems || []).find(
      (item) => String(item._id) === String(req.params.connectionId)
    );

    if (!requestItem) {
      return res.status(404).json({
        success: false,
        message: 'Connection request not found'
      });
    }

    requestItem.status = String(status).toLowerCase();
    requestItem.respondedAt = new Date();

    profile.updatedAt = new Date();
    await profile.save();

    return res.json({
      success: true,
      message: `Connection request ${requestItem.status} successfully`,
      connectionRequest: requestItem
    });
  } catch (error) {
    console.error('respondToConnectionRequest error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to respond to connection request'
    });
  }
};