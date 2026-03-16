const CAProfile = require('../models/CAProfile');
const CAConnection = require('../models/CAConnection');
const User = require('../models/User');

// @desc    Create or update CA profile
// @route   POST /api/ca/profile
exports.createOrUpdateProfile = async (req, res) => {
  try {
    const { 
      firmName, bio, yearsOfExperience, address, city, province, 
      postalCode, serviceRadius, specializations, services, languages,
      phone, website, availableFor
    } = req.body;

    // Geocode address (simplified - in production use Google Maps API)
    const coordinates = [-79.3832, 43.6532]; // Example: Toronto coordinates

    const profileData = {
      user: req.user.id,
      firmName,
      bio,
      yearsOfExperience,
      address: { street: address, city, province, postalCode },
      location: {
        type: 'Point',
        coordinates
      },
      serviceRadius: serviceRadius || 50,
      specializations,
      services,
      languages,
      phone,
      website,
      availableFor,
      updatedAt: Date.now()
    };

    const profile = await CAProfile.findOneAndUpdate(
      { user: req.user.id },
      profileData,
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Error updating CA profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};

// @desc    Toggle accepting clients status
// @route   PUT /api/ca/toggle-status
exports.toggleAcceptingStatus = async (req, res) => {
  try {
    const { accepting } = req.body;

    const profile = await CAProfile.findOneAndUpdate(
      { user: req.user.id },
      { 
        acceptingNewClients: accepting,
        availabilityStatus: accepting ? 'active' : 'not-accepting'
      },
      { new: true }
    );

    res.json({
      success: true,
      acceptingNewClients: profile.acceptingNewClients
    });
  } catch (error) {
    console.error('Error toggling status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating status'
    });
  }
};

// @desc    Search for CAs near a location
// @route   GET /api/ca/search
exports.searchCAs = async (req, res) => {
  try {
    const { 
      lat, lng, maxDistance = 50000, // in meters (50km default)
      specialization, service, acceptingNewClients,
      userType, limit = 20, page = 1
    } = req.query;

    const query = { verified: true };

    // Filter by accepting clients
    if (acceptingNewClients === 'true') {
      query.acceptingNewClients = true;
    }

    // Filter by user type specialization
    if (userType && userType !== 'all') {
      query.availableFor = { $in: [userType, 'all'] };
    }

    // Filter by specialization
    if (specialization && specialization !== 'all') {
      query.specializations = specialization;
    }

    // Filter by service
    if (service && service !== 'all') {
      query.services = service;
    }

    // Location-based search
    let sort = {};
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      };
    } else {
      // If no location, sort by rating
      sort = { rating: -1, reviewCount: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [profiles, total] = await Promise.all([
      CAProfile.find(query)
        .populate('user', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      CAProfile.countDocuments(query)
    ]);

    // Add distance information
    const results = profiles.map(profile => ({
      ...profile,
      distance: profile.location?.coordinates 
        ? calculateDistance(
            parseFloat(lat), parseFloat(lng),
            profile.location.coordinates[1], 
            profile.location.coordinates[0]
          )
        : null
    }));

    res.json({
      success: true,
      results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error searching CAs:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching for CAs'
    });
  }
};

// @desc    Get CA profile by ID
// @route   GET /api/ca/:id
exports.getCAProfile = async (req, res) => {
  try {
    const profile = await CAProfile.findOne({ user: req.params.id })
      .populate('user', 'name email')
      .lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'CA profile not found'
      });
    }

    // Increment view count
    await CAProfile.updateOne(
      { user: req.params.id },
      { $inc: { profileViews: 1 } }
    );

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Error fetching CA profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};

// @desc    Request connection with CA
// @route   POST /api/ca/connect
exports.requestConnection = async (req, res) => {
  try {
    const { caId, message } = req.body;

    // Check if connection already exists
    const existingConnection = await CAConnection.findOne({
      user: req.user.id,
      ca: caId
    });

    if (existingConnection) {
      return res.status(400).json({
        success: false,
        message: 'Connection request already exists'
      });
    }

    const connection = await CAConnection.create({
      user: req.user.id,
      ca: caId,
      message,
      initiatedBy: 'user'
    });

    // Increment connection requests count for CA
    await CAProfile.updateOne(
      { user: caId },
      { $inc: { connectionRequests: 1 } }
    );

    res.json({
      success: true,
      connection
    });
  } catch (error) {
    console.error('Error requesting connection:', error);
    res.status(500).json({
      success: false,
      message: 'Error requesting connection'
    });
  }
};

// @desc    Get CA dashboard stats
// @route   GET /api/ca/dashboard/stats
exports.getCADashboardStats = async (req, res) => {
  try {
    const profile = await CAProfile.findOne({ user: req.user.id });
    
    const connections = await CAConnection.find({ ca: req.user.id })
      .populate('user', 'name email userType');

    const stats = {
      profileViews: profile?.profileViews || 0,
      connectionRequests: profile?.connectionRequests || 0,
      acceptingNewClients: profile?.acceptingNewClients || false,
      totalConnections: connections.length,
      pendingRequests: connections.filter(c => c.status === 'pending').length,
      activeClients: connections.filter(c => c.status === 'accepted').length,
      recentRequests: connections
        .filter(c => c.status === 'pending')
        .slice(0, 5)
        .map(c => ({
          id: c._id,
          clientName: c.user.name,
          clientType: c.user.userType,
          message: c.message,
          date: c.createdAt
        }))
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching CA stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stats'
    });
  }
};

// Helper function to calculate distance between coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10;
}