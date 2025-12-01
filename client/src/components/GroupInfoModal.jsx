import React, { useState, useEffect, useRef } from 'react';
import { X, Users, Crown, UserPlus, LogOut, Share2, Copy, Check, MoreVertical, Shield, Edit2, Camera, Trash2, Save } from 'lucide-react';
import { useToast } from './Toast.jsx';
import Dialog from './Dialog';

const GroupInfoModal = ({ isOpen, onClose, groupId, currentUserId, onGroupUpdated, onGroupLeft }) => {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showMemberMenu, setShowMemberMenu] = useState(null);
  const [makeAdminDialog, setMakeAdminDialog] = useState({ isOpen: false, memberId: null, memberName: '' });
  const [removeMemberDialog, setRemoveMemberDialog] = useState({ isOpen: false, memberId: null, memberName: '' });
  const [exitDialog, setExitDialog] = useState({ isOpen: false });
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState(new Set());
  const [addingMembers, setAddingMembers] = useState(false);
  const toast = useToast();
  const memberMenuRef = useRef(null);
  const photoInputRef = useRef(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (isOpen && groupId) {
      fetchGroupDetails();
    }
  }, [isOpen, groupId]);

  // Close member menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (memberMenuRef.current && !memberMenuRef.current.contains(event.target)) {
        setShowMemberMenu(null);
      }
    };

    if (showMemberMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMemberMenu]);

  const fetchGroupDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/chat/groups/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setGroup(data.room);
          setGroupName(data.room.name || '');
          setGroupDescription(data.room.description || '');
          // Generate invite link if not exists
          if (data.room.inviteLink) {
            setInviteLink(`${window.location.origin}/chat/join/${data.room.inviteLink}`);
          }
        }
      } else {
        toast.error('Failed to load group details');
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
      toast.error('Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInviteLink = async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/chat/groups/${groupId}/invite-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isPublic: false,
          expiryDays: null
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setInviteLink(`${window.location.origin}/chat/join/${data.inviteLink}`);
          toast.success('Invite link generated!');
        }
      } else {
        toast.error('Failed to generate invite link');
      }
    } catch (error) {
      console.error('Error generating invite link:', error);
      toast.error('Failed to generate invite link');
    }
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareLink = () => {
    if (navigator.share && inviteLink) {
      navigator.share({
        title: `Join ${group?.name}`,
        text: `Join ${group?.name} on Campus Connect`,
        url: inviteLink
      }).catch(err => console.error('Error sharing:', err));
    } else {
      handleCopyLink();
    }
  };

  const handleMakeAdmin = async () => {
    if (!makeAdminDialog.memberId) return;

    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/chat/groups/${groupId}/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          memberId: makeAdminDialog.memberId
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success(`${makeAdminDialog.memberName} is now an admin`);
          setMakeAdminDialog({ isOpen: false, memberId: null, memberName: '' });
          fetchGroupDetails(); // Refresh group details
          onGroupUpdated?.();
        } else {
          toast.error(data.message || 'Failed to make member admin');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to make member admin');
      }
    } catch (error) {
      console.error('Error making member admin:', error);
      toast.error('Failed to make member admin');
    }
  };

  const handleUpdateGroup = async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/chat/groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDescription.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Group updated successfully');
          setEditingName(false);
          setEditingDescription(false);
          fetchGroupDetails();
          onGroupUpdated?.();
        } else {
          toast.error(data.message || 'Failed to update group');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to update group');
      }
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error('Failed to update group');
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Image size must be less than 5MB');
      return;
    }

    setSelectedPhoto(file);
    uploadGroupPhoto(file);
  };

  const uploadGroupPhoto = async (file) => {
    setUploadingPhoto(true);
    try {
      // Get upload signature with the correct folder for groups
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      // Request signature with folder parameter for groups
      const signatureResponse = await fetch(`${API_BASE}/api/chat/upload-signature?folder=chat/groups`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!signatureResponse.ok) {
        throw new Error('Failed to get upload signature');
      }

      const { signature, timestamp, cloudName, apiKey, folder } = await signatureResponse.json();

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder);
      formData.append('resource_type', 'image');

      const xhr = new XMLHttpRequest();
      
      xhr.addEventListener('load', async () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          const photoUrl = response.secure_url;

          // Update group with photo URL
          const updateResponse = await fetch(`${API_BASE}/api/chat/groups/${groupId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              profilePicture: photoUrl
            })
          });

          if (updateResponse.ok) {
            const data = await updateResponse.json();
            if (data.success) {
              toast.success('Group photo updated');
              setSelectedPhoto(null);
              fetchGroupDetails();
              onGroupUpdated?.();
            } else {
              toast.error('Failed to update group photo');
            }
          }
        } else {
          const errorText = xhr.responseText;
          console.error('Upload error:', errorText);
          toast.error('Failed to upload photo');
        }
        setUploadingPhoto(false);
      });

      xhr.addEventListener('error', () => {
        toast.error('Failed to upload photo');
        setUploadingPhoto(false);
      });

      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
      xhr.send(formData);
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
      setUploadingPhoto(false);
    }
  };

  const fetchFriends = async () => {
    setLoadingFriends(true);
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/users/${currentUserId}/friends`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filter out friends who are already members
          const existingMemberIds = new Set(
            group?.participants?.map(p => p.id?.toString() || p._id?.toString()) || []
          );
          const availableFriends = (data.friends || []).filter(
            friend => !existingMemberIds.has(friend.id?.toString() || friend._id?.toString())
          );
          setFriends(availableFriends);
        }
      } else {
        toast.error('Failed to load friends');
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast.error('Failed to load friends');
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleToggleFriendSelection = (friendId) => {
    setSelectedFriends(prev => {
      const newSet = new Set(prev);
      if (newSet.has(friendId)) {
        newSet.delete(friendId);
      } else {
        newSet.add(friendId);
      }
      return newSet;
    });
  };

  const handleAddSelectedMembers = async () => {
    if (selectedFriends.size === 0) {
      toast.error('Please select at least one friend to add');
      return;
    }

    setAddingMembers(true);
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const memberIds = Array.from(selectedFriends);
      
      // Add members one by one
      const promises = memberIds.map(memberId =>
        fetch(`${API_BASE}/api/chat/groups/${groupId}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ memberId })
        })
      );

      const results = await Promise.allSettled(promises);
      let successCount = 0;
      let errorCount = 0;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      });

      if (successCount > 0) {
        toast.success(`Successfully added ${successCount} member${successCount > 1 ? 's' : ''}`);
        setShowAddMembersModal(false);
        setSelectedFriends(new Set());
        fetchGroupDetails(); // Refresh group details
        onGroupUpdated?.();
      } else {
        toast.error('Failed to add members');
      }
    } catch (error) {
      console.error('Error adding members:', error);
      toast.error('Failed to add members');
    } finally {
      setAddingMembers(false);
    }
  };

  const handleExitGroup = async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/chat/groups/${groupId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('You left the group');
          setExitDialog({ isOpen: false });
          onGroupLeft?.();
          onClose();
        } else {
          toast.error(data.message || 'Failed to leave group');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to leave group');
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave group');
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMemberDialog.memberId) return;

    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/api/chat/groups/${groupId}/members/${removeMemberDialog.memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success(`${removeMemberDialog.memberName} removed from group`);
          setRemoveMemberDialog({ isOpen: false, memberId: null, memberName: '' });
          fetchGroupDetails();
          onGroupUpdated?.();
        } else {
          toast.error(data.message || 'Failed to remove member');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const isAdmin = group?.isAdmin || false;
  const isCurrentUser = (userId) => userId?.toString() === currentUserId?.toString();
  const isMemberAdmin = (memberId) => group?.admins?.some(a => a.id?.toString() === memberId?.toString());

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }}
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
            <h2 className="text-xl font-bold text-gray-900">Group Info</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading group details...</div>
            ) : group ? (
              <>
                {/* Group Photo, Name and Description */}
                <div className="p-6 text-center border-b border-gray-200">
                  <div className="relative inline-block mb-4">
                    {group.profilePicture ? (
                      <img
                        src={group.profilePicture}
                        alt={group.name}
                        className="w-20 h-20 rounded-full object-cover mx-auto"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center mx-auto">
                        <Users size={40} className="text-white" />
                      </div>
                    )}
                    {isAdmin && (
                      <>
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />
                        <button
                          onClick={() => photoInputRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
                          title="Change group photo"
                        >
                          {uploadingPhoto ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Camera size={16} />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                  
                  {editingName ? (
                    <div className="mb-3">
                      <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-lg font-semibold text-black"
                        placeholder="Group name"
                        autoFocus
                        style={{ color: '#000000' }}
                      />
                      <div className="flex justify-center gap-2 mt-2">
                        <button
                          onClick={handleUpdateGroup}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm cursor-pointer flex items-center gap-1"
                        >
                          <Save size={14} />
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingName(false);
                            setGroupName(group.name || '');
                          }}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <div className="flex items-center justify-center gap-2">
                        <h3 className="text-xl font-semibold text-gray-900">{group.name}</h3>
                        {isAdmin && (
                          <button
                            onClick={() => setEditingName(true)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                            title="Edit group name"
                          >
                            <Edit2 size={16} className="text-gray-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-sm text-gray-500 mb-3">{group.participants?.length || 0} members</p>

                  {editingDescription ? (
                    <div className="mt-3">
                      <textarea
                        value={groupDescription}
                        onChange={(e) => setGroupDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none text-black"
                        placeholder="Add a description"
                        rows={3}
                        autoFocus
                        style={{ color: '#000000' }}
                      />
                      <div className="flex justify-center gap-2 mt-2">
                        <button
                          onClick={handleUpdateGroup}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm cursor-pointer flex items-center gap-1"
                        >
                          <Save size={14} />
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingDescription(false);
                            setGroupDescription(group.description || '');
                          }}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3">
                      {group.description ? (
                        <div className="flex items-center justify-center gap-2">
                          <p className="text-sm text-gray-700">{group.description}</p>
                          {isAdmin && (
                            <button
                              onClick={() => setEditingDescription(true)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                              title="Edit description"
                            >
                              <Edit2 size={14} className="text-gray-600" />
                            </button>
                          )}
                        </div>
                      ) : (
                        isAdmin && (
                          <button
                            onClick={() => setEditingDescription(true)}
                            className="text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                          >
                            Add description
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>

                    {/* Invite Link Section - Only visible to admins */}
                    {isAdmin && (
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <UserPlus size={18} className="text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">Invite to Group</span>
                          </div>
                        </div>
                        {inviteLink ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                              <input
                                type="text"
                                value={inviteLink}
                                readOnly
                                className="flex-1 text-xs bg-transparent text-black truncate"
                                style={{ color: '#000000' }}
                              />
                              <button
                                onClick={handleCopyLink}
                                className="p-1.5 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                                title="Copy link"
                              >
                                {copied ? (
                                  <Check size={16} className="text-green-600" />
                                ) : (
                                  <Copy size={16} className="text-gray-600" />
                                )}
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleShareLink}
                                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer flex items-center justify-center gap-2"
                              >
                                <Share2 size={16} />
                                Share
                              </button>
                              <button
                                onClick={handleGenerateInviteLink}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer"
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={handleGenerateInviteLink}
                            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium cursor-pointer"
                          >
                            Generate Invite Link
                          </button>
                        )}
                      </div>
                    )}

                {/* Members Section */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      {group.participants?.length || 0} Members
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setShowAddMembersModal(true);
                          fetchFriends();
                        }}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer flex items-center gap-2"
                      >
                        <UserPlus size={16} />
                        Add Members
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {group.participants?.map((member) => {
                      const memberId = member.id?.toString() || member._id?.toString();
                      const isAdminMember = isMemberAdmin(memberId);
                      const isCurrentUserMember = isCurrentUser(memberId);
                      
                      return (
                        <div
                          key={memberId}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg group relative"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {member.profilePicture ? (
                              <img
                                src={member.profilePicture}
                                alt={member.username}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-semibold">
                                {member.username?.[0]?.toUpperCase() || 'U'}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {member.username || member.email?.split('@')[0] || 'User'}
                                  {isCurrentUserMember && ' (You)'}
                                </p>
                                {isAdminMember && (
                                  <Crown size={14} className="text-yellow-500 flex-shrink-0" />
                                )}
                              </div>
                              {isAdminMember && (
                                <p className="text-xs text-gray-500">Admin</p>
                              )}
                            </div>
                          </div>
                          {isAdmin && !isCurrentUserMember && (
                            <div className="relative" ref={memberMenuRef}>
                              <button
                                onClick={() => setShowMemberMenu(showMemberMenu === memberId ? null : memberId)}
                                className="p-1.5 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                              >
                                <MoreVertical size={16} className="text-gray-600" />
                              </button>
                              {showMemberMenu === memberId && (
                                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[180px] z-10 py-1">
                                  {!isAdminMember && (
                                    <button
                                      onClick={() => {
                                        setMakeAdminDialog({
                                          isOpen: true,
                                          memberId: memberId,
                                          memberName: member.username || member.email?.split('@')[0] || 'User'
                                        });
                                        setShowMemberMenu(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 transition-colors cursor-pointer text-gray-700"
                                    >
                                      <Shield size={14} />
                                      Make Admin
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setRemoveMemberDialog({
                                        isOpen: true,
                                        memberId: memberId,
                                        memberName: member.username || member.email?.split('@')[0] || 'User'
                                      });
                                      setShowMemberMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 transition-colors cursor-pointer text-red-600"
                                  >
                                    <Trash2 size={14} />
                                    Remove Member
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-gray-500">Failed to load group details</div>
            )}
          </div>

          {/* Footer - Exit Group */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => setExitDialog({ isOpen: true })}
              className="w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut size={16} />
              Exit Group
            </button>
          </div>
        </div>
      </div>

      {/* Make Admin Dialog */}
      <Dialog
        isOpen={makeAdminDialog.isOpen}
        onClose={() => setMakeAdminDialog({ isOpen: false, memberId: null, memberName: '' })}
        onConfirm={handleMakeAdmin}
        title="Make Admin"
        message={`Are you sure you want to make ${makeAdminDialog.memberName} an admin? They will be able to manage the group.`}
        confirmText="Make Admin"
        cancelText="Cancel"
        type="info"
      />

      {/* Remove Member Dialog */}
      <Dialog
        isOpen={removeMemberDialog.isOpen}
        onClose={() => setRemoveMemberDialog({ isOpen: false, memberId: null, memberName: '' })}
        onConfirm={handleRemoveMember}
        title="Remove Member"
        message={`Are you sure you want to remove ${removeMemberDialog.memberName} from this group?`}
        confirmText="Remove"
        cancelText="Cancel"
        type="danger"
      />

      {/* Exit Group Dialog */}
      <Dialog
        isOpen={exitDialog.isOpen}
        onClose={() => setExitDialog({ isOpen: false })}
        onConfirm={handleExitGroup}
        title="Exit Group"
        message="Are you sure you want to exit this group? You will no longer receive messages from this group."
        confirmText="Exit"
        cancelText="Cancel"
        type="danger"
      />

      {/* Add Members Modal */}
      {showAddMembersModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-[60]"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)'
          }}
          onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowAddMembersModal(false);
            setSelectedFriends(new Set());
          }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <h2 className="text-xl font-bold text-gray-900">Add Members</h2>
              <button
                onClick={() => {
                  setShowAddMembersModal(false);
                  setSelectedFriends(new Set());
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingFriends ? (
                <div className="text-center text-gray-500 py-8">Loading friends...</div>
              ) : friends.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No friends available to add. All your friends are already in this group.
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => {
                    const friendId = friend.id?.toString() || friend._id?.toString();
                    const isSelected = selectedFriends.has(friendId);
                    
                    return (
                      <div
                        key={friendId}
                        onClick={() => handleToggleFriendSelection(friendId)}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 border-2 border-blue-500' : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        {friend.profilePicture ? (
                          <img
                            src={friend.profilePicture}
                            alt={friend.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-semibold">
                            {friend.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {friend.username || friend.email?.split('@')[0] || 'User'}
                          </p>
                          {friend.email && (
                            <p className="text-xs text-gray-500 truncate">{friend.email}</p>
                          )}
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <Check size={14} className="text-white" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {friends.length > 0 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddMembersModal(false);
                    setSelectedFriends(new Set());
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSelectedMembers}
                  disabled={selectedFriends.size === 0 || addingMembers}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {addingMembers ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      Add {selectedFriends.size > 0 ? `(${selectedFriends.size})` : ''}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default GroupInfoModal;

