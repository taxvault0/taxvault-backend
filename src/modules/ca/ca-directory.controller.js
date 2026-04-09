const mongoose = require('mongoose');
const CAProfile = require('./ca-profile.model');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Search for CAs near a location / directory listing
// @route   GET /api/ca-directory/search
exports.searchCAs = async (req, res) => {
  try {
    const {
      lat,
      lng,
      maxDistance = 50000,
      specialization,
      service,
      acceptingNewClients,
      userType,
      search,
      language,
      limit = 20,
      page = 1
    } = req.query;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const parsedMaxDistance = Math.max(parseInt(maxDistance, 10) || 50000, 1000);

    const hasCoordinates =
      lat !== undefined &&
      lng !== undefined &&
      !Number.isNaN(parseFloat(lat)) &&
      !Number.isNaN(parseFloat(lng));

    const baseQuery = {
      verified: true
    };

    if (acceptingNewClients === 'true') {
      baseQuery.acceptingNewClients = true;
    }

    if (userType && userType !== 'all') {
      baseQuery.availableFor = { $in: [userType, 'all'] };
    }

    if (specialization && specialization !== 'all') {
      baseQuery.specializations = { $in: [specialization] };
    }

    if (service && service !== 'all') {
      baseQuery.services = { $in: [service] };
    }

    if (language && language !== 'all') {
      baseQuery.languages = { $in: [language] };
    }

    if (search && String(search).trim()) {
      const searchRegex = new RegExp(escapeRegex(String(search).trim()), 'i');

      baseQuery.$or = [
        { firmName: searchRegex },
        { bio: searchRegex },
        { specializations: searchRegex },
        { services: searchRegex },
        { languages: searchRegex },
        { otherLanguage: searchRegex },
        { 'address.city': searchRegex },
        { 'address.province': searchRegex }
      ];
    }

    let profiles = [];
    let total = 0;

    if (hasCoordinates) {
      const aggregatePipeline = [
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)]
            },
            distanceField: 'distanceMeters',
            maxDistance: parsedMaxDistance,
            spherical: true,
            query: baseQuery
          }
        },
        {
          $sort: { distanceMeters: 1, rating: -1, reviewCount: -1, createdAt: -1 }
        },
        {
          $facet: {
            results: [
              { $skip: (parsedPage - 1) * parsedLimit },
              { $limit: parsedLimit },
              {
                $lookup: {
                  from: 'users',
                  localField: 'user',
                  foreignField: '_id',
                  as: 'user'
                }
              },
              {
                $unwind: {
                  path: '$user',
                  preserveNullAndEmptyArrays: true
                }
              }
            ],
            totalCount: [{ $count: 'count' }]
          }
        }
      ];

      const aggregateResult = await CAProfile.aggregate(aggregatePipeline);
      const facet = aggregateResult[0] || {};
      profiles = facet.results || [];
      total = facet.totalCount?.[0]?.count || 0;
    } else {
      const sort = { rating: -1, reviewCount: -1, createdAt: -1 };
      const skip = (parsedPage - 1) * parsedLimit;

      const result = await Promise.all([
        CAProfile.find(baseQuery)
          .populate('user', 'name email')
          .sort(sort)
          .skip(skip)
          .limit(parsedLimit)
          .lean(),
        CAProfile.countDocuments(baseQuery)
      ]);

      profiles = result[0];
      total = result[1];
    }

    const results = profiles.map((profile) => {
      const distance =
        hasCoordinates
          ? profile.distanceMeters != null
            ? Math.round((profile.distanceMeters / 1000) * 10) / 10
            : profile.location?.coordinates
              ? calculateDistance(
                  parseFloat(lat),
                  parseFloat(lng),
                  profile.location.coordinates[1],
                  profile.location.coordinates[0]
                )
              : null
          : null;

      return {
        id: profile._id,
        userId: profile.user?._id || profile.user,
        name: profile.user?.name || '',
        email: profile.user?.email || '',
        firmName: profile.firmName || '',
        bio: profile.bio || '',
        yearsOfExperience: profile.yearsOfExperience || 0,
        address: profile.address || null,
        serviceRadius: profile.serviceRadius || 0,
        specializations: Array.isArray(profile.specializations)
          ? profile.specializations
          : [],
        services: Array.isArray(profile.services) ? profile.services : [],
        languages: Array.isArray(profile.languages) ? profile.languages : [],
        otherLanguage: profile.otherLanguage || '',
        phone: profile.phone || '',
        alternatePhone: profile.alternatePhone || '',
        firmPhone: profile.firmPhone || '',
        website: profile.website || '',
        availableFor: Array.isArray(profile.availableFor) ? profile.availableFor : [],
        acceptingNewClients: Boolean(profile.acceptingNewClients),
        availabilityStatus: profile.availabilityStatus || 'inactive',
        profileViews: profile.profileViews || 0,
        connectionRequests: profile.connectionRequests || 0,
        rating: profile.rating || 0,
        reviewCount: profile.reviewCount || 0,
        yearAdmitted: profile.yearAdmitted || null,
        licenseNumber: profile.licenseNumber || profile.caNumber || '',
        policyNumber: profile.policyNumber || '',
        peerReviewDate: profile.peerReviewDate || null,
        hoursOfOperation: profile.hoursOfOperation || {},
        distance
      };
    });

    return res.json({
      success: true,
      results,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('Error searching CAs:', error);
    return res.status(500).json({
      success: false,
      message: 'Error searching for CAs'
    });
  }
};

// @desc    Get CA profile by user ID / public directory profile
// @route   GET /api/ca-directory/:id
exports.getCAProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ user: id }, { _id: id }] }
      : { user: id };

    const profile = await CAProfile.findOne(query)
      .populate('user', 'name email')
      .lean();

    if (!profile || !profile.verified) {
      return res.status(404).json({
        success: false,
        message: 'CA profile not found'
      });
    }

    await CAProfile.updateOne(
      { _id: profile._id },
      { $inc: { profileViews: 1 } }
    );

    return res.json({
      success: true,
      profile: {
        id: profile._id,
        userId: profile.user?._id || profile.user,
        name: profile.user?.name || '',
        email: profile.user?.email || '',
        firmName: profile.firmName || '',
        bio: profile.bio || '',
        yearsOfExperience: profile.yearsOfExperience || 0,
        address: profile.address || null,
        serviceRadius: profile.serviceRadius || 0,
        specializations: Array.isArray(profile.specializations)
          ? profile.specializations
          : [],
        services: Array.isArray(profile.services) ? profile.services : [],
        languages: Array.isArray(profile.languages) ? profile.languages : [],
        otherLanguage: profile.otherLanguage || '',
        phone: profile.phone || '',
        alternatePhone: profile.alternatePhone || '',
        firmPhone: profile.firmPhone || '',
        website: profile.website || '',
        availableFor: Array.isArray(profile.availableFor) ? profile.availableFor : [],
        acceptingNewClients: Boolean(profile.acceptingNewClients),
        availabilityStatus: profile.availabilityStatus || 'inactive',
        profileViews: (profile.profileViews || 0) + 1,
        connectionRequests: profile.connectionRequests || 0,
        rating: profile.rating || 0,
        reviewCount: profile.reviewCount || 0,
        yearAdmitted: profile.yearAdmitted || null,
        licenseNumber: profile.licenseNumber || profile.caNumber || '',
        policyNumber: profile.policyNumber || '',
        peerReviewDate: profile.peerReviewDate || null,
        hoursOfOperation: profile.hoursOfOperation || {},
        location: profile.location || null
      }
    });
  } catch (error) {
    console.error('Error fetching CA profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};

// Helper function to calculate distance between coordinates in KM
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}