const jwt = require('jsonwebtoken');
const VIDEOSDK_API_KEY = process.env.VIDEOSDK_API_KEY;
const VIDEOSDK_SECRET_KEY = process.env.VIDEOSDK_SECRET_KEY;
const VIDEOSDK_API_URL = 'https://api.videosdk.live';

// @desc    Create VideoSDK meeting for call (1-on-1 or group)
// @route   POST /api/calls/create-room
// @access  Private
const createCallRoom = async (req, res) => {
  try {
    if (!VIDEOSDK_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'VideoSDK API key not configured'
      });
    }

    const { otherUserId, roomId, callType, isGroup = false } = req.body; // callType: 'voice' or 'video'
    const currentUserId = req.user._id.toString();

    // For 1-on-1 calls, otherUserId is required
    if (!isGroup && !otherUserId) {
      return res.status(400).json({
        success: false,
        message: 'Other user ID is required for 1-on-1 calls'
      });
    }

    if (!isGroup && otherUserId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create call with yourself'
      });
    }

    // Generate meetingId (create unique ID for each call to ensure fresh meetings)
    let meetingId;
    if (isGroup && roomId) {
      // For group calls, create unique meeting ID based on roomId + timestamp
      // This ensures each call creates a fresh meeting instead of reusing old ones
      meetingId = `group-${roomId}-${Date.now()}`;
    } else {
      // For 1-on-1 calls, create a unique meeting ID
      const userIds = [currentUserId, otherUserId].sort();
      meetingId = `call-${userIds[0]}-${userIds[1]}-${Date.now()}`;
    }

    // Check for secret key (required for VideoSDK)
    if (!VIDEOSDK_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: 'VideoSDK Secret Key is required. Please add VIDEOSDK_SECRET_KEY to your .env file.'
      });
    }

    // Generate authentication token for API calls (server-side API access)
    // For server-side API calls, we need 'crawler' role, not 'rtc'
    const authTokenPayload = {
      apikey: VIDEOSDK_API_KEY,
      permissions: ['allow_join', 'allow_mod'],
      version: 2,
      roles: ['crawler'] // 'crawler' role for accessing v2 API (server-side)
    };
    const authToken = jwt.sign(authTokenPayload, VIDEOSDK_SECRET_KEY, {
      algorithm: 'HS256',
      expiresIn: '120m'
    });

    // Step 1: Create the room in VideoSDK first
    // VideoSDK expects token WITHOUT "Bearer" prefix - just the token
    const createRoomResponse = await fetch(`${VIDEOSDK_API_URL}/v2/rooms`, {
      method: 'POST',
      headers: {
        'Authorization': authToken, // VideoSDK expects token directly, not "Bearer <token>"
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customRoomId: meetingId
      })
    });

    if (!createRoomResponse.ok) {
      const errorText = await createRoomResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText || 'Failed to create room' };
      }
      console.error('VideoSDK room creation error:', {
        status: createRoomResponse.status,
        statusText: createRoomResponse.statusText,
        error: errorData,
        authToken: authToken.substring(0, 50) + '...'
      });
      throw new Error(errorData.message || errorData.error || `Failed to create VideoSDK room: ${createRoomResponse.status} ${createRoomResponse.statusText}`);
    }

    const roomData = await createRoomResponse.json();
    console.log('VideoSDK room created:', roomData);
    const actualRoomId = roomData.roomId || roomData.id || meetingId;

    // Step 2: Generate JWT token for VideoSDK meeting (with roomId)
    const tokenPayload = {
      apikey: VIDEOSDK_API_KEY,
      permissions: ['allow_join', 'allow_mod'],
      version: 2,
      roles: ['rtc'], // 'rtc' role for running Meeting/Room
      roomId: actualRoomId
    };

    // VideoSDK requires SECRET KEY for JWT signing
    const token = jwt.sign(tokenPayload, VIDEOSDK_SECRET_KEY, {
      algorithm: 'HS256',
      expiresIn: '24h'
    });

    const tokenData = { token };

    // For 1-on-1 calls, generate token for other user and send notification
    if (!isGroup && otherUserId) {
      // Generate JWT token for the other user (participant, not host)
      const otherTokenPayload = {
        apikey: VIDEOSDK_API_KEY,
        permissions: ['allow_join'],
        version: 2,
        roles: ['rtc'], // 'rtc' role for running Meeting/Room
        roomId: actualRoomId
      };

      const otherToken = jwt.sign(otherTokenPayload, VIDEOSDK_SECRET_KEY, {
        algorithm: 'HS256',
        expiresIn: '24h'
      });

      const otherTokenData = { token: otherToken };

      // Emit socket event to notify other user about incoming call
      const io = req.app.get('io');
      if (!io) {
        console.error('Socket.io instance not found');
        return res.status(500).json({
          success: false,
          message: 'Socket.io not initialized'
        });
      }
      
      const { emitToUser, userSockets } = require('../config/socket');
      
      console.log(`[Call] Emitting incoming_call to user ${otherUserId} for meeting ${actualRoomId}`);
      console.log(`[Call] User sockets map size: ${userSockets.size}`);
      console.log(`[Call] Target user socket exists: ${userSockets.has(otherUserId?.toString())}`);
      
      emitToUser(io, otherUserId, 'incoming_call', {
        meetingId: actualRoomId,
        token: otherTokenData.token,
        callerId: currentUserId,
        callerName: req.user.username || req.user.email?.split('@')[0] || 'User',
        callerProfilePicture: req.user.profilePicture || '',
        callType: callType || 'video',
        apiKey: VIDEOSDK_API_KEY // Include API key in the call data
      });
    } else if (isGroup) {
      // For group calls, notify all group members
      const io = req.app.get('io');
      const Room = require('../models/Room');
      
      try {
        const room = await Room.findById(roomId).populate('participants', '_id');
        if (room && room.participants) {
          room.participants.forEach(participant => {
            const participantId = participant._id.toString();
            if (participantId !== currentUserId) {
              // Generate JWT token for each participant
              const participantTokenPayload = {
                apikey: VIDEOSDK_API_KEY,
                permissions: ['allow_join'],
                version: 2,
                roles: ['rtc'], // 'rtc' role for running Meeting/Room
                roomId: actualRoomId
              };

              const participantToken = jwt.sign(participantTokenPayload, VIDEOSDK_SECRET_KEY, {
                algorithm: 'HS256',
                expiresIn: '24h'
              });

              const { emitToUser } = require('../config/socket');
              emitToUser(io, participantId, 'incoming_group_call', {
                meetingId: actualRoomId,
                token: participantToken,
                roomId: roomId,
                callerId: currentUserId,
                callerName: req.user.username || req.user.email?.split('@')[0] || 'User',
                callType: callType || 'video',
                apiKey: VIDEOSDK_API_KEY // Include API key for group calls too
              });
            }
          });
        }
      } catch (error) {
        console.error('Error fetching room participants:', error);
      }
    }

    res.status(200).json({
      success: true,
      meeting: {
        meetingId: actualRoomId,
        token: tokenData.token
      },
      callType: callType || 'video',
      apiKey: VIDEOSDK_API_KEY // Include API key for caller too
    });
  } catch (error) {
    console.error('Error creating call room:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create call room'
    });
  }
};

// @desc    Generate token for existing meeting
// @route   POST /api/calls/join-room
// @access  Private
const joinCallRoom = async (req, res) => {
  try {
    if (!VIDEOSDK_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'VideoSDK API key not configured'
      });
    }

    const { meetingId, callType } = req.body;
    const currentUserId = req.user._id.toString();

    if (!meetingId) {
      return res.status(400).json({
        success: false,
        message: 'Meeting ID is required'
      });
    }

    // Generate JWT token for joining user
    if (!VIDEOSDK_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: 'VideoSDK Secret Key is required for token generation'
      });
    }

    // Generate authentication token for API calls (to validate room)
    // For server-side API calls, we need 'crawler' role
    const authTokenPayload = {
      apikey: VIDEOSDK_API_KEY,
      permissions: ['allow_join', 'allow_mod'],
      version: 2,
      roles: ['crawler'] // 'crawler' role for accessing v2 API (server-side)
    };
    const authToken = jwt.sign(authTokenPayload, VIDEOSDK_SECRET_KEY, {
      algorithm: 'HS256',
      expiresIn: '120m'
    });

    // Validate that the room exists (GET request, not POST)
    const validateResponse = await fetch(`${VIDEOSDK_API_URL}/v2/rooms/validate/${meetingId}`, {
      method: 'GET',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json'
      }
    });

    if (!validateResponse.ok) {
      const errorText = await validateResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText || 'Room validation failed' };
      }
      throw new Error(errorData.message || errorData.error || 'Room does not exist or is invalid');
    }

    const tokenPayload = {
      apikey: VIDEOSDK_API_KEY,
      permissions: ['allow_join'],
      version: 2,
      roles: ['rtc'], // 'rtc' role for running Meeting/Room
      roomId: meetingId
    };

    const token = jwt.sign(tokenPayload, VIDEOSDK_SECRET_KEY, {
      algorithm: 'HS256',
      expiresIn: '24h'
    });

    const tokenData = { token };

    res.status(200).json({
      success: true,
      token: tokenData.token,
      meetingId
    });
  } catch (error) {
    console.error('Error joining call room:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to join call room'
    });
  }
};

// @desc    End VideoSDK session/meeting
// @route   POST /api/calls/end-session
// @access  Private
const endCallSession = async (req, res) => {
  try {
    const { meetingId } = req.body;
    const currentUserId = req.user._id.toString();

    if (!meetingId) {
      return res.status(400).json({
        success: false,
        message: 'Meeting ID is required'
      });
    }

    if (!VIDEOSDK_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: 'VideoSDK Secret Key is required'
      });
    }

    // Generate authentication token for API calls
    const authTokenPayload = {
      apikey: VIDEOSDK_API_KEY,
      permissions: ['allow_join', 'allow_mod'],
      version: 2,
      roles: ['crawler'] // 'crawler' role for accessing v2 API (server-side)
    };
    const authToken = jwt.sign(authTokenPayload, VIDEOSDK_SECRET_KEY, {
      algorithm: 'HS256',
      expiresIn: '120m'
    });

    // End the session
    const endSessionResponse = await fetch(`${VIDEOSDK_API_URL}/v2/sessions/end`, {
      method: 'POST',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        roomId: meetingId
      })
    });

    if (!endSessionResponse.ok) {
      const errorText = await endSessionResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText || 'Session might already be ended' };
      }
      console.log('[Call] VideoSDK end session response (might be expected if session already ended):', {
        status: endSessionResponse.status,
        error: errorData
      });
      // Don't throw error - session might already be ended by VideoSDK automatically
    } else {
      const sessionData = await endSessionResponse.json();
      console.log('[Call] VideoSDK session ended successfully:', sessionData);
    }

    res.status(200).json({
      success: true,
      message: 'Session ended successfully'
    });
  } catch (error) {
    console.error('[Call] Error ending call session:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to end session'
    });
  }
};

module.exports = {
  createCallRoom,
  joinCallRoom,
  endCallSession
};
