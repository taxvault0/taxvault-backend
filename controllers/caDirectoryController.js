const CAProfile = require('../models/CAProfile');
const CAConnection = require('../models/CAConnection');
const User = require('../models/User');
const CaAccess = require('../models/CaAccess');
const createNotification = require('../utils/createNotification');

// @desc    Create or update CA profile
// @route   POST /api/ca/profile
exports.createOrUpdateProfile = async (req, res) => {
  try {
    const {
      firmName,
      bio,
      yearsOfExperience,
      address,
      city,
      province,
      postalCode,
      serviceRadius,
      specializations,
      services,
      languages,
      phone,
      website,
      availableFor
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

    return res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Error updating CA profile:', error);
    return res.status(500).json({
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

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'CA profile not found'
      });
    }

    return res.json({
      success: true,
      acceptingNewClients: profile.acceptingNewClients
    });
  } catch (error) {
    console.error('Error toggling status:', error);
    return res.status(500).json({
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
      lat,
      lng,
      maxDistance = 50000, // in meters (50km default)
      specialization,
      service,
      acceptingNewClients,
      userType,
      limit = 20,
      page = 1
    } = req.query;

    const query = { verified: true };

    if (acceptingNewClients === 'true') {
      query.acceptingNewClients = true;
    }

    if (userType && userType !== 'all') {
      query.availableFor = { $in: [userType, 'all'] };
    }

    if (specialization && specialization !== 'all') {
      query.specializations = specialization;
    }

    if (service && service !== 'all') {
      query.services = service;
    }

    let sort = {};
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(maxDistance, 10)
        }
      };
    } else {
      sort = { rating: -1, reviewCount: -1 };
    }

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    const [profiles, total] = await Promise.all([
      CAProfile.find(query)
        .populate('user', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      CAProfile.countDocuments(query)
    ]);

    const results = profiles.map((profile) => ({
      ...profile,
      distance:
        lat && lng && profile.location?.coordinates
          ? calculateDistance(
              parseFloat(lat),
              parseFloat(lng),
              profile.location.coordinates[1],
              profile.location.coordinates[0]
            )
          : null
    }));

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

    await CAProfile.updateOne(
      { user: req.params.id },
      { $inc: { profileViews: 1 } }
    );

    return res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Error fetching CA profile:', error);
    return res.status(500).json({
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

    if (!caId) {
      return res.status(400).json({
        success: false,
        message: 'caId is required'
      });
    }

    const existingUser = await User.findById(caId).select('role name email');
    if (!existingUser || existingUser.role !== 'ca') {
      return res.status(404).json({
        success: false,
        message: 'CA not found'
      });
    }

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

    await CAProfile.updateOne(
      { user: caId },
      { $inc: { connectionRequests: 1 } }
    );

    await createNotification({
      recipient: caId,
      sender: req.user.id,
      type: 'ca-connection-request',
      title: 'New CA connection request',
      message: `${req.user.name || 'A client'} sent you a connection request.`,
      data: {
        connectionId: connection._id,
        route: '/ca/dashboard'
      }
    });

    return res.json({
      success: true,
      connection
    });
  } catch (error) {
    console.error('Error requesting connection:', error);
    return res.status(500).json({
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
      .populate('user', 'name email userType')
      .sort({ createdAt: -1 });

    const stats = {
      profileViews: profile?.profileViews || 0,
      connectionRequests: profile?.connectionRequests || 0,
      acceptingNewClients: profile?.acceptingNewClients || false,
      totalConnections: connections.length,
      pendingRequests: connections.filter((c) => c.status === 'pending').length,
      activeClients: connections.filter((c) => c.status === 'accepted').length,
      recentRequests: connections
        .filter((c) => c.status === 'pending')
        .slice(0, 5)
        .map((c) => ({
          id: c._id,
          clientName: c.user?.name,
          clientType: c.user?.userType,
          message: c.message,
          date: c.createdAt
        }))
    };

    return res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching CA stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching stats'
    });
  }
};

// @desc    CA accepts or rejects a connection request
// @route   PATCH /api/ca/connections/:connectionId/respond
exports.respondToConnectionRequest = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { action, note } = req.body;

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be accept or reject'
      });
    }

    const connection = await CAConnection.findById(connectionId)
      .populate('user', 'name email role clientId')
      .populate('ca', 'name email role');

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Connection request not found'
      });
    }

    if (
      String(connection.ca._id || connection.ca) !== String(req.user._id || req.user.id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to respond to this request'
      });
    }

    if (connection.status === 'accepted' || connection.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: `This request has already been ${connection.status}`
      });
    }

    if (action === 'accept') {
      connection.status = 'accepted';
      connection.respondedAt = new Date();
      connection.responseNote = note || '';

      await connection.save();

      await CaAccess.findOneAndUpdate(
        {
          user: connection.user._id || connection.user,
          ca: connection.ca._id || connection.ca
        },
        {
          $set: {
            user: connection.user._id || connection.user,
            ca: connection.ca._id || connection.ca,
            accessGranted: true,
            accessType: 'full',
            grantedAt: new Date(),
            revokedAt: null
          }
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      );

      await createNotification({
        recipient: connection.user._id || connection.user,
        sender: req.user._id || req.user.id,
        type: 'ca-connection-accepted',
        title: 'CA connection accepted',
        message: `${connection.ca.name} accepted your connection request.`,
        data: {
          connectionId: connection._id,
          route: '/user/dashboard'
        }
      });

      return res.json({
        success: true,
        message: 'Connection request accepted',
        connection
      });
    }

    connection.status = 'rejected';
    connection.respondedAt = new Date();
    connection.responseNote = note || '';

    await connection.save();

    await CaAccess.findOneAndUpdate(
      {
        user: connection.user._id || connection.user,
        ca: connection.ca._id || connection.ca
      },
      {
        $set: {
          user: connection.user._id || connection.user,
          ca: connection.ca._id || connection.ca,
          accessGranted: false,
          revokedAt: new Date()
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    await createNotification({
      recipient: connection.user._id || connection.user,
      sender: req.user._id || req.user.id,
      type: 'ca-connection-rejected',
      title: 'CA connection rejected',
      message: `${connection.ca.name} rejected your connection request.`,
      data: {
        connectionId: connection._id,
        route: '/user/dashboard'
      }
    });

    return res.json({
      success: true,
      message: 'Connection request rejected',
      connection
    });
  } catch (error) {
    console.error('respondToConnectionRequest error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to respond to connection request'
    });
  }
};

// Helper function to calculate distance between coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
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