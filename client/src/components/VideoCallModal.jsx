import React, { useEffect, useState, useRef } from 'react';
import { X, Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { MeetingProvider, useMeeting, useParticipant } from '@videosdk.live/react-sdk';

const VIDEOSDK_API_KEY = import.meta.env.VITE_VIDEOSDK_API_KEY;

// Participant video component
const ParticipantView = ({ participantId, callType, isSmall = false }) => {
  const { webcamStream, micStream, webcamOn, micOn, displayName } = useParticipant(participantId);

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      {webcamOn && webcamStream ? (
        <video
          autoPlay
          playsInline
          muted={false}
          ref={(el) => {
            if (el && webcamStream) {
              el.srcObject = new MediaStream([webcamStream.track]);
              // Optimize video rendering for better quality
              el.setAttribute('playsinline', 'true');
              el.setAttribute('webkit-playsinline', 'true');
            }
          }}
          className="w-full h-full object-cover"
          style={{
            objectFit: 'cover',
            imageRendering: 'high-quality',
            WebkitImageRendering: 'high-quality'
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <div className="text-center text-white">
            <div className={`${isSmall ? 'w-12 h-12 text-lg' : 'w-20 h-20 text-2xl'} rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-semibold mx-auto ${isSmall ? 'mb-1' : 'mb-2'}`}>
              {displayName?.[0]?.toUpperCase() || 'U'}
            </div>
            {!isSmall && <p className="text-sm">{displayName || 'Participant'}</p>}
          </div>
        </div>
      )}
      <div className={`absolute ${isSmall ? 'bottom-1 left-1' : 'bottom-2 left-2'} flex items-center gap-1 bg-black/50 rounded ${isSmall ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}>
        {!micOn && <MicOff size={isSmall ? 12 : 16} className="text-red-400" />}
        {!isSmall && <span className="text-white text-xs">{displayName || 'Participant'}</span>}
      </div>
    </div>
  );
};

// Main meeting component
const MeetingView = ({ meetingId, token, callType, onLeave, callerInfo, isIncoming, isGroup = false, onTimeoutMessage }) => {
  const { join, leave, toggleMic, toggleWebcam, localParticipant, participants, changeWebcamQuality } = useMeeting();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'voice');
  const [isLoading, setIsLoading] = useState(true);
  const groupCallTimeoutRef = useRef(null);

  useEffect(() => {
    // Join meeting when component mounts
    join();
    
    // Set initial camera/mic state and video quality
    setTimeout(() => {
      if (callType === 'voice') {
        // For voice calls, ensure webcam is off initially
        if (localParticipant && localParticipant.webcamOn) {
          toggleWebcam();
        }
        setIsVideoOff(true);
      } else if (callType === 'video' && localParticipant) {
        // For video calls, set high quality after joining
        // Wait a bit for the meeting to fully initialize
        setTimeout(() => {
          try {
            if (changeWebcamQuality && typeof changeWebcamQuality === 'function') {
              changeWebcamQuality('high'); // Options: 'low', 'medium', 'high'
              console.log('[Video] Set webcam quality to high');
            }
          } catch (error) {
            console.log('[Video] Could not set webcam quality:', error);
          }
        }, 500);
      }
      setIsLoading(false);
    }, 1500); // Increased timeout to allow meeting to fully initialize

    return () => {
      // Clear group call timeout if it exists
      if (groupCallTimeoutRef.current) {
        clearTimeout(groupCallTimeoutRef.current);
        groupCallTimeoutRef.current = null;
      }
      
      // Cleanup: leave meeting when component unmounts
      console.log('[Video] Component unmounting, leaving meeting:', meetingId);
      try {
        leave();
      } catch (error) {
        console.error('[Video] Error leaving meeting on unmount:', error);
      }
    };
  }, [meetingId]); // Add meetingId as dependency

  const handleEndCall = () => {
    console.log('[Video] Ending call, leaving meeting:', meetingId);
    // Leave the meeting properly
    try {
      leave();
      console.log('[Video] Successfully left meeting');
    } catch (error) {
      console.error('[Video] Error leaving meeting:', error);
    }
    // Call onLeave to update parent state
    onLeave();
  };

  // 60-second timeout for group calls - end if no one joins other than caller
  useEffect(() => {
    // Clear any existing timeout
    if (groupCallTimeoutRef.current) {
      clearTimeout(groupCallTimeoutRef.current);
      groupCallTimeoutRef.current = null;
    }

    // Only apply timeout for group calls when caller is not receiving (isIncoming = false)
    if (isGroup && !isIncoming && !isLoading) {
      console.log('[Video] Starting 60-second timeout for group call');
      
      groupCallTimeoutRef.current = setTimeout(() => {
        // Filter out local participant to get remote participants
        const remoteParticipants = Array.from(participants.values()).filter(participant => {
          const participantId = participant.id?.toString() || participant.id;
          const localParticipantId = localParticipant?.id?.toString() || localParticipant?.id;
          return participantId !== localParticipantId;
        });

        // If no remote participants joined, end the call
        if (remoteParticipants.length === 0) {
          console.log('[Video] 60-second timeout reached - no one joined the group call');
          
          // Show message and end call
          if (onTimeoutMessage) {
            onTimeoutMessage('No one joined');
          }
          
          // End the call
          handleEndCall();
        } else {
          // Someone joined, clear timeout (this shouldn't happen as we check participants.length)
          console.log('[Video] Participants joined, timeout cleared');
        }
      }, 60000); // 60 seconds
    }

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (groupCallTimeoutRef.current) {
        clearTimeout(groupCallTimeoutRef.current);
        groupCallTimeoutRef.current = null;
      }
    };
  }, [isGroup, isIncoming, isLoading, participants, localParticipant, onTimeoutMessage, onLeave, meetingId, leave]);

  // Monitor participants for group calls - clear timeout if someone joins
  useEffect(() => {
    if (isGroup && !isIncoming && groupCallTimeoutRef.current) {
      // Filter out local participant to get remote participants
      const remoteParticipants = Array.from(participants.values()).filter(participant => {
        const participantId = participant.id?.toString() || participant.id;
        const localParticipantId = localParticipant?.id?.toString() || localParticipant?.id;
        return participantId !== localParticipantId;
      });

      // If someone joined, clear the timeout
      if (remoteParticipants.length > 0) {
        console.log('[Video] Participant joined group call, clearing timeout');
        if (groupCallTimeoutRef.current) {
          clearTimeout(groupCallTimeoutRef.current);
          groupCallTimeoutRef.current = null;
        }
      }
    }
  }, [participants, isGroup, isIncoming, localParticipant]);

  const handleToggleMute = () => {
    toggleMic();
    setIsMuted(!isMuted);
  };

  const handleToggleVideo = () => {
    // Allow video toggle for both voice and video calls
    toggleWebcam();
    setIsVideoOff(!isVideoOff);
    
    // After enabling webcam, set high quality
    if (!isVideoOff && localParticipant) {
      setTimeout(() => {
        try {
          if (changeWebcamQuality && typeof changeWebcamQuality === 'function') {
            changeWebcamQuality('high');
            console.log('[Video] Set webcam quality to high after enabling');
          }
        } catch (error) {
          console.log('[Video] Could not set webcam quality:', error);
        }
      }, 500);
    }
  };

  // Filter out local participant from remote participants to avoid duplicates
  // Use Set to ensure unique participant IDs (handle both string and object IDs)
  const seenParticipantIds = new Set();
  const localParticipantId = localParticipant?.id?.toString() || localParticipant?.id;
  
  const participantsArray = Array.from(participants.values())
    .filter(participant => {
      const participantId = participant.id?.toString() || participant.id;
      
      // Skip local participant (compare as strings to avoid type mismatch)
      if (participantId === localParticipantId) {
        return false;
      }
      
      // Skip duplicates based on participant ID
      if (seenParticipantIds.has(participantId)) {
        console.log('[Video] Duplicate participant detected:', participantId, participant.displayName);
        return false;
      }
      
      seenParticipantIds.add(participantId);
      return true;
    });

  // Calculate grid layout based on total participants (local + remote)
  const totalParticipants = (localParticipant ? 1 : 0) + participantsArray.length;
  
  // Debug log for participant count
  if (participantsArray.length !== Array.from(participants.values()).length - (localParticipant ? 1 : 0)) {
    console.log('[Video] Participant filtering:', {
      local: localParticipantId,
      localDisplayName: localParticipant?.displayName,
      remote: participantsArray.map(p => ({ id: p.id?.toString() || p.id, name: p.displayName })),
      total: totalParticipants,
      rawCount: participants.size,
      filteredCount: participantsArray.length
    });
  }
  
  // For 1-on-1 calls: show remote participant full screen, local as small overlay
  // For group calls (3+): use grid layout
  const isOneOnOne = participantsArray.length === 1 && totalParticipants === 2;
      
  return (
    <div className="w-full h-full relative bg-gray-900">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-20">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Connecting...</p>
          </div>
        </div>
      )}

      {isOneOnOne ? (
        /* WhatsApp-style layout: Remote full screen, local small overlay */
        <>
          {/* Remote Participant - Full Screen */}
          <div className="absolute inset-0 w-full h-full">
            {participantsArray[0] && (
              <ParticipantView 
                participantId={participantsArray[0].id} 
                callType={callType}
              />
            )}
          </div>

          {/* Local Participant - Small overlay in top-right corner */}
          {localParticipant && (
            <div className="absolute top-4 right-4 w-32 h-44 rounded-lg overflow-hidden shadow-2xl border-2 border-white/30 z-30 bg-gray-800 cursor-move">
              <ParticipantView 
                participantId={localParticipant.id} 
                callType={callType}
                isSmall={true}
              />
            </div>
          )}
        </>
      ) : (
        /* Grid layout for group calls or when waiting */
        <div className="w-full h-full p-4 grid gap-4" style={{
          gridTemplateColumns: totalParticipants === 1 ? '1fr' : 
                              totalParticipants === 2 ? '1fr 1fr' : 
                              totalParticipants === 3 ? 'repeat(2, 1fr)' :
                              totalParticipants === 4 ? 'repeat(2, 1fr)' :
                              'repeat(3, 1fr)',
          gridTemplateRows: totalParticipants <= 2 ? '1fr' :
                            totalParticipants <= 4 ? 'repeat(2, 1fr)' :
                            'repeat(3, 1fr)'
        }}>
          {/* Local Participant */}
          {localParticipant && (
            <ParticipantView 
              participantId={localParticipant.id} 
              callType={callType}
            />
          )}

          {/* Remote Participants (excluding local to avoid duplicates) */}
          {participantsArray.map((participant, index) => {
            const participantId = participant.id?.toString() || participant.id || `participant-${index}`;
            return (
              <ParticipantView 
                key={`remote-${participantId}-${index}`} 
                participantId={participant.id} 
                callType={callType}
              />
            );
          })}
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 z-10">
        <div className="flex items-center justify-center gap-4">
          {/* Mute/Unmute */}
          <button
            onClick={handleToggleMute}
            className={`p-4 rounded-full transition-colors cursor-pointer ${
              isMuted 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          {/* Video On/Off (available for both voice and video calls) */}
          <button
            onClick={handleToggleVideo}
            className={`p-4 rounded-full transition-colors cursor-pointer ${
              isVideoOff 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
          </button>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
            title="End call"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Main VideoCallModal component
const VideoCallModal = ({ 
  isOpen, 
  onClose, 
  meetingId, 
  token, 
  callType = 'video',
  isIncoming = false,
  callerInfo = null,
  currentUserName = 'User',
  onCallEnded,
  apiKey = null, // API key from backend (required)
  isGroup = false, // Whether this is a group call
  onTimeoutMessage = null // Callback for timeout messages
}) => {
  if (!isOpen || !meetingId || !token) return null;
  
  // Get API key from prop (sent from backend) or fallback to env var if set
  // Backend always sends the API key, so this should always be available
  const effectiveApiKey = apiKey || VIDEOSDK_API_KEY;
  
  // Don't render MeetingProvider until we have a valid API key to avoid 401 errors
  if (!effectiveApiKey) {
    console.warn('[VideoCallModal] API key not available yet, waiting...');
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }}
      >
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center text-gray-900">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p>Initializing call...</p>
          </div>
        </div>
      </div>
    );
  }

  const handleLeave = () => {
    onCallEnded?.();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)'
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {callerInfo && isIncoming && (
              <>
                {callerInfo.profilePicture ? (
                  <img
                    src={callerInfo.profilePicture}
                    alt={callerInfo.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
                    {callerInfo.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <p className="font-semibold">{callerInfo.name}</p>
                  <p className="text-sm text-white/80">
                    {callType === 'video' ? 'Video call' : 'Voice call'}
                  </p>
                </div>
              </>
            )}
            {!isIncoming && (
              <p className="font-semibold">
                {callType === 'video' ? 'Video Call' : 'Voice Call'}
              </p>
            )}
          </div>
          <button
            onClick={handleLeave}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Meeting View */}
        <div className="w-full h-full pt-16">
          {effectiveApiKey && token && meetingId ? (
            <MeetingProvider
              config={{
                meetingId: meetingId,
                micEnabled: true,
                webcamEnabled: false, // Start with webcam off, user can toggle it on
                name: currentUserName, // Use current user's name for VideoSDK
                // Video quality settings
                multiStream: true, // Enable multi-stream for adaptive quality layers
                maxResolution: 'fhd', // Set maximum resolution: 'sd' (480p), 'hd' (720p), 'fhd' (1080p)
                cameraFacingMode: 'user' // 'user' for front camera, 'environment' for back
              }}
              token={token}
              apiKey={effectiveApiKey}
            >
              <MeetingView 
                meetingId={meetingId}
                token={token}
                callType={callType}
                onLeave={handleLeave}
                callerInfo={callerInfo}
                isIncoming={isIncoming}
                isGroup={isGroup}
                onTimeoutMessage={onTimeoutMessage}
              />
            </MeetingProvider>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <div className="text-center">
                <p className="text-red-400 mb-2">Missing VideoSDK configuration</p>
                <p className="text-sm text-gray-400">
                  {!effectiveApiKey && 'API Key missing. '}
                  {!token && 'Token missing. '}
                  {!meetingId && 'Meeting ID missing.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCallModal;

