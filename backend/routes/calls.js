const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const CallHistory = require('../models/CallHistory');
const User = require('../models/User');

// Helper function to format duration
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}

// @desc    Get call statistics for user
// @route   GET /api/calls/stats
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [
      totalCalls,
      completedCalls,
      missedCalls,
      rejectedCalls,
      totalDuration
    ] = await Promise.all([
      CallHistory.countDocuments({
        $or: [{ caller: userId }, { receiver: userId }]
      }),
      CallHistory.countDocuments({
        $or: [{ caller: userId }, { receiver: userId }],
        status: 'completed'
      }),
      CallHistory.countDocuments({
        receiver: userId,
        status: 'missed'
      }),
      CallHistory.countDocuments({
        $or: [{ caller: userId }, { receiver: userId }],
        status: 'rejected'
      }),
      CallHistory.aggregate([
        {
          $match: {
            $or: [{ caller: userId }, { receiver: userId }],
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalDuration: { $sum: '$duration' }
          }
        }
      ])
    ]);

    const stats = {
      totalCalls,
      completedCalls,
      missedCalls,
      rejectedCalls,
      totalDuration: totalDuration[0]?.totalDuration || 0,
      formattedTotalDuration: formatDuration(totalDuration[0]?.totalDuration || 0)
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching call stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch call statistics',
      error: error.message
    });
  }
});

// @desc    Get call history for authenticated user
// @route   GET /api/calls/history
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const callHistory = await CallHistory.getCallHistoryForUser(
      req.user.userId,
      page,
      limit
    );

    res.json({
      success: true,
      data: callHistory
    });
  } catch (error) {
    console.error('Error fetching call history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch call history',
      error: error.message
    });
  }
});

// @desc    Get specific call details
// @route   GET /api/calls/:callId
// @access  Private
router.get('/:callId', auth, async (req, res) => {
  try {
    const { callId } = req.params;
    
    const call = await CallHistory.findOne({
      callId,
      $or: [
        { caller: req.user.userId },
        { receiver: req.user.userId }
      ]
    })
    .populate('caller', 'firstName lastName fullName avatar')
    .populate('receiver', 'firstName lastName fullName avatar');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    const isIncoming = call.receiver._id.toString() === req.user.userId;
    const otherUser = isIncoming ? call.caller : call.receiver;

    res.json({
      success: true,
      data: {
        _id: call._id,
        callId: call.callId,
        type: call.callType,
        status: call.status,
        direction: isIncoming ? 'incoming' : 'outgoing',
        otherUser: {
          _id: otherUser._id,
          name: otherUser.fullName,
          avatar: otherUser.avatar
        },
        startTime: call.startTime,
        endTime: call.endTime,
        duration: call.duration,
        formattedDuration: call.formatDuration(),
        createdAt: call.createdAt,
        updatedAt: call.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching call details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch call details',
      error: error.message
    });
  }
});

// @desc    Record a call
// @route   POST /api/calls/record
// @access  Private
router.post('/record', auth, async (req, res) => {
  try {
    const {
      receiverId,
      callType,
      status,
      startTime,
      endTime,
      callId
    } = req.body;

    // Validate required fields
    if (!receiverId || !callType || !status || !startTime || !callId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    // Create call record
    const callData = {
      caller: req.user.userId,
      receiver: receiverId,
      callType,
      status,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : undefined,
      callId
    };

    const call = await CallHistory.recordCall(callData);
    
    // Populate user data for response
    await call.populate('caller', 'firstName lastName fullName avatar');
    await call.populate('receiver', 'firstName lastName fullName avatar');

    res.status(201).json({
      success: true,
      message: 'Call recorded successfully',
      data: call
    });
  } catch (error) {
    console.error('Error recording call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record call',
      error: error.message
    });
  }
});

// @desc    Update call record (for ending calls)
// @route   PUT /api/calls/:callId
// @access  Private
router.put('/:callId', auth, async (req, res) => {
  try {
    const { callId } = req.params;
    const { endTime, status } = req.body;

    const call = await CallHistory.findOne({
      callId,
      $or: [
        { caller: req.user.userId },
        { receiver: req.user.userId }
      ]
    });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Update call record
    if (endTime) {
      call.endTime = new Date(endTime);
    }
    if (status) {
      call.status = status;
    }

    await call.save();
    await call.populate('caller', 'firstName lastName fullName avatar');
    await call.populate('receiver', 'firstName lastName fullName avatar');

    res.json({
      success: true,
      message: 'Call updated successfully',
      data: call
    });
  } catch (error) {
    console.error('Error updating call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update call',
      error: error.message
    });
  }
});

// @desc    Delete call from history
// @route   DELETE /api/calls/:callId
// @access  Private
router.delete('/:callId', auth, async (req, res) => {
  try {
    const { callId } = req.params;

    const call = await CallHistory.findOne({
      callId,
      $or: [
        { caller: req.user.userId },
        { receiver: req.user.userId }
      ]
    });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    await call.deleteOne();

    res.json({
      success: true,
      message: 'Call deleted from history'
    });
  } catch (error) {
    console.error('Error deleting call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete call',
      error: error.message
    });
  }
});

module.exports = router;