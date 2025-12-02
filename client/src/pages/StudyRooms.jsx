import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Hash, Plus, Settings, Users, Search, MessageSquare, Mic, Volume2,
    Crown, Shield, User, LogOut, X, Edit2, Trash2, Send, Image as ImageIcon,
    BookOpen, Calendar, Tag, Globe, Lock, Loader2, UserPlus, Mail, CheckCircle, XCircle, MoreVertical
} from 'lucide-react';
import { useToast } from '../components/Toast.jsx';
import DashboardNavbar from '../components/DashboardNavbar';
import { useSocket } from '../contexts/SocketContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const StudyRooms = () => {
    const navigate = useNavigate();
    const { groupId, channelId } = useParams();
    const toast = useToast();
    const { socket } = useSocket();
    const [studyGroups, setStudyGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [showJoinRequests, setShowJoinRequests] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showGroupSettings, setShowGroupSettings] = useState(false);
    const [joinRequests, setJoinRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [selectedMemberMenu, setSelectedMemberMenu] = useState(null);
    const [confirmationDialog, setConfirmationDialog] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const settingsMenuRef = useRef(null);

    useEffect(() => {
        loadStudyGroups();
    }, []);

    useEffect(() => {
        if (groupId) {
            loadStudyGroup(groupId);
        }
    }, [groupId]);

    useEffect(() => {
        if (selectedGroup && channelId) {
            const channel = selectedGroup.channels?.find(c => c._id === channelId);
            if (channel) {
                setSelectedChannel(channel);
                loadChannelMessages(groupId, channelId);
            }
        }
    }, [selectedGroup, channelId, groupId]);

    useEffect(() => {
        if (socket && selectedChannel) {
            const channelRoom = `channel-${selectedChannel._id}`;
            socket.emit('join_channel', channelRoom);

            const handleNewMessage = (message) => {
                // Normalize IDs to strings for comparison
                const messageChannelId = message.channelId?.toString();
                const selectedChannelId = selectedChannel._id?.toString();
                if (messageChannelId === selectedChannelId) {
                    setMessages(prev => [...prev, message]);
                    scrollToBottom();
                }
            };

            socket.on('new_message', handleNewMessage);

            return () => {
                socket.emit('leave_channel', channelRoom);
                socket.off('new_message', handleNewMessage);
            };
        }
    }, [socket, selectedChannel]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Socket listeners for join requests
    useEffect(() => {
        if (!socket) return;

        const handleJoinRequestReceived = (data) => {
            if (selectedGroup && data.studyGroup.id === selectedGroup._id) {
                loadJoinRequests();
            }
        };

        const handleJoinRequestApproved = (data) => {
            toast.success(`Your request to join ${data.studyGroup.name} was approved!`);
            loadStudyGroups();
            if (selectedGroup && data.studyGroup.id === selectedGroup._id) {
                loadStudyGroup(selectedGroup._id);
            }
        };

        const handleJoinRequestRejected = (data) => {
            toast.error(`Your request to join ${data.studyGroup.name} was rejected.`);
        };

        const handleStudyGroupInvitation = (data) => {
            toast.success(`You've been invited to join ${data.studyGroup.name}!`);
            loadStudyGroups();
        };

        const handleMemberLeft = (data) => {
            if (selectedGroup && data.studyGroup && data.studyGroup._id === selectedGroup._id) {
                loadStudyGroup(selectedGroup._id);
                loadStudyGroups();
            }
        };

        const handleStudyGroupDeleted = (data) => {
            if (selectedGroup && data.groupId === selectedGroup._id) {
                toast.error('This study group has been deleted');
                setSelectedGroup(null);
                setSelectedChannel(null);
                setMessages([]);
                loadStudyGroups();
                navigate('/study-rooms');
            } else {
                loadStudyGroups();
            }
        };

        socket.on('join_request_received', handleJoinRequestReceived);
        socket.on('join_request_approved', handleJoinRequestApproved);
        socket.on('join_request_rejected', handleJoinRequestRejected);
        socket.on('study_group_invitation', handleStudyGroupInvitation);
        socket.on('member_left', handleMemberLeft);
        socket.on('study_group_deleted', handleStudyGroupDeleted);

        return () => {
            socket.off('join_request_received', handleJoinRequestReceived);
            socket.off('join_request_approved', handleJoinRequestApproved);
            socket.off('join_request_rejected', handleJoinRequestRejected);
            socket.off('study_group_invitation', handleStudyGroupInvitation);
            socket.off('member_left', handleMemberLeft);
            socket.off('study_group_deleted', handleStudyGroupDeleted);
        };
    }, [socket, selectedGroup, toast, navigate]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadStudyGroups = async () => {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        try {
            const response = await fetch(`${API_BASE}/api/study-groups`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setStudyGroups(data.studyGroups);
                if (groupId && data.studyGroups.length > 0) {
                    const group = data.studyGroups.find(g => g._id === groupId);
                    if (group) setSelectedGroup(group);
                }
            }
        } catch (error) {
            console.error('Error loading study groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStudyGroup = async (id) => {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        try {
            const response = await fetch(`${API_BASE}/api/study-groups/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setSelectedGroup(data.studyGroup);
            }
        } catch (error) {
            console.error('Error loading study group:', error);
        }
    };

    const loadChannelMessages = async (groupId, channelId) => {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        try {
            const response = await fetch(`${API_BASE}/api/study-groups/${groupId}/channels/${channelId}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setMessages(data.messages);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedChannel || sending) return;

        setSending(true);
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const image = fileInputRef.current?.files?.[0] ? await convertToBase64(fileInputRef.current.files[0]) : '';

        try {
            const response = await fetch(`${API_BASE}/api/study-groups/${groupId}/channels/${channelId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: messageInput.trim(),
                    image: image
                })
            });

            const data = await response.json();
            if (data.success) {
                setMessageInput('');
                if (fileInputRef.current) fileInputRef.current.value = '';
            } else {
                toast.error(data.message || 'Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleCreateGroup = async (formData) => {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        try {
            const response = await fetch(`${API_BASE}/api/study-groups`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (data.success) {
                toast.success('Study group created successfully!');
                setShowCreateGroup(false);
                await loadStudyGroups();
                // Notify other components (like DashboardSidebar) to refresh
                window.dispatchEvent(new Event('studyGroupCreated'));
                if (data.studyGroup?._id) {
                    navigate(`/study-rooms/${data.studyGroup._id}`);
                }
            } else {
                toast.error(data.message || 'Failed to create study group');
                throw new Error(data.message || 'Failed to create study group');
            }
        } catch (error) {
            console.error('Error creating study group:', error);
            toast.error(error.message || 'Failed to create study group');
            throw error;
        }
    };

    const handleCreateChannel = async (formData) => {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        try {
            const response = await fetch(`${API_BASE}/api/study-groups/${groupId}/channels`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (data.success) {
                toast.success('Channel created successfully!');
                setShowCreateChannel(false);
                loadStudyGroup(groupId);
                navigate(`/study-rooms/${groupId}/${data.channel._id}`);
            } else {
                toast.error(data.message || 'Failed to create channel');
            }
        } catch (error) {
            console.error('Error creating channel:', error);
            toast.error('Failed to create channel');
        }
    };

    // Check if current user is member
    const isCurrentUserMember = () => {
        if (!selectedGroup) return false;
        const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        const currentUserId = currentUser._id || currentUser.id;
        return selectedGroup.members?.some(m => 
            (m.user?._id || m.user)?.toString() === currentUserId?.toString()
        );
    };

    // Check if current user is owner
    const isCurrentUserOwner = () => {
        if (!selectedGroup) return false;
        const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        const currentUserId = currentUser._id || currentUser.id;
        return (selectedGroup.owner?._id || selectedGroup.owner)?.toString() === currentUserId?.toString();
    };

    // Check if current user is admin
    const isCurrentUserAdmin = () => {
        if (!selectedGroup || !isCurrentUserMember()) return false;
        const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        const currentUserId = currentUser._id || currentUser.id;
        const member = selectedGroup.members?.find(m => 
            (m.user?._id || m.user)?.toString() === currentUserId?.toString()
        );
        if (!member) return false;
        const adminRole = selectedGroup.roles?.find(r => r.name === 'Admin');
        return member.roles?.some(r => r.toString() === adminRole?._id?.toString());
    };

    // Request to join group
    const handleRequestToJoin = async () => {
        if (!selectedGroup) return;
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        try {
            const response = await fetch(`${API_BASE}/api/study-groups/${selectedGroup._id}/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: '' })
            });

            const data = await response.json();
            if (data.success) {
                toast.success('Join request sent! Waiting for approval.');
            } else {
                toast.error(data.message || 'Failed to send join request');
            }
        } catch (error) {
            console.error('Error requesting to join:', error);
            toast.error('Failed to send join request');
        }
    };

    // Load join requests
    const loadJoinRequests = async () => {
        if (!selectedGroup || !groupId) return;
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        setLoadingRequests(true);
        try {
            const response = await fetch(`${API_BASE}/api/study-groups/${groupId}/requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setJoinRequests(data.requests);
            }
        } catch (error) {
            console.error('Error loading join requests:', error);
        } finally {
            setLoadingRequests(false);
        }
    };

    // Approve join request
    const handleApproveRequest = async (requestId) => {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        try {
            const response = await fetch(`${API_BASE}/api/study-groups/${groupId}/requests/${requestId}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Join request approved!');
                loadJoinRequests();
                loadStudyGroup(groupId);
            } else {
                toast.error(data.message || 'Failed to approve request');
            }
        } catch (error) {
            console.error('Error approving request:', error);
            toast.error('Failed to approve request');
        }
    };

    // Reject join request
    const handleRejectRequest = async (requestId) => {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        try {
            const response = await fetch(`${API_BASE}/api/study-groups/${groupId}/requests/${requestId}/reject`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Join request rejected');
                loadJoinRequests();
            } else {
                toast.error(data.message || 'Failed to reject request');
            }
        } catch (error) {
            console.error('Error rejecting request:', error);
            toast.error('Failed to reject request');
        }
    };

    // Invite member
    const handleInviteMember = async (userEmail) => {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        try {
            const response = await fetch(`${API_BASE}/api/study-groups/${groupId}/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userEmail })
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Member invited successfully!');
                setShowInviteModal(false);
                loadStudyGroup(groupId);
            } else {
                toast.error(data.message || 'Failed to invite member');
            }
        } catch (error) {
            console.error('Error inviting member:', error);
            toast.error('Failed to invite member');
        }
    };

    // Make admin
    const handleMakeAdmin = async (memberId) => {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        try {
            const response = await fetch(`${API_BASE}/api/study-groups/${groupId}/members/${memberId}/make-admin`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Member promoted to admin!');
                loadStudyGroup(groupId);
                setSelectedMemberMenu(null);
            } else {
                toast.error(data.message || 'Failed to make admin');
            }
        } catch (error) {
            console.error('Error making admin:', error);
            toast.error('Failed to make admin');
        }
    };

    // Remove member
    const handleRemoveMember = async (memberId) => {
        setConfirmationDialog({
            title: 'Remove Member',
            message: 'Are you sure you want to remove this member?',
            confirmText: 'Remove',
            cancelText: 'Cancel',
            type: 'danger',
            onConfirm: async () => {
                const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                try {
                    const response = await fetch(`${API_BASE}/api/study-groups/${groupId}/members/${memberId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await response.json();
                    if (data.success) {
                        toast.success('Member removed successfully');
                        loadStudyGroup(groupId);
                        setSelectedMemberMenu(null);
                    } else {
                        toast.error(data.message || 'Failed to remove member');
                    }
                } catch (error) {
                    console.error('Error removing member:', error);
                    toast.error('Failed to remove member');
                } finally {
                    setConfirmationDialog(null);
                }
            },
            onCancel: () => {
                setConfirmationDialog(null);
            }
        });
    };

    // Leave group
    const handleLeaveGroup = async () => {
        if (!selectedGroup || !groupId) return;
        
        const confirmMessage = isCurrentUserOwner() 
            ? 'You are the owner. If you leave, you will need to transfer ownership first. Are you sure you want to leave?'
            : 'Are you sure you want to leave this study group?';
        
        setConfirmationDialog({
            title: 'Leave Study Group',
            message: confirmMessage,
            confirmText: 'Leave',
            cancelText: 'Cancel',
            type: 'warning',
            onConfirm: async () => {
                const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                try {
                    const response = await fetch(`${API_BASE}/api/study-groups/${groupId}/leave`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await response.json();
                    if (data.success) {
                        toast.success('Left study group successfully');
                        setSelectedGroup(null);
                        setSelectedChannel(null);
                        setMessages([]);
                        loadStudyGroups();
                        navigate('/study-rooms');
                    } else {
                        toast.error(data.message || 'Failed to leave group');
                    }
                } catch (error) {
                    console.error('Error leaving group:', error);
                    toast.error('Failed to leave group');
                } finally {
                    setConfirmationDialog(null);
                }
            },
            onCancel: () => {
                setConfirmationDialog(null);
            }
        });
    };

    // Delete group
    const handleDeleteGroup = async () => {
        if (!selectedGroup || !groupId) return;
        
        const groupName = selectedGroup.name || 'this group';
        
        // First confirmation
        setConfirmationDialog({
            title: 'Delete Study Group',
            message: `Are you sure you want to delete "${groupName}"? This action cannot be undone and will delete all channels and messages.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'danger',
            onConfirm: () => {
                // Second confirmation
                setConfirmationDialog({
                    title: 'Final Confirmation',
                    message: 'This will permanently delete the group. Are you absolutely sure?',
                    confirmText: 'Yes, Delete',
                    cancelText: 'Cancel',
                    type: 'danger',
                    onConfirm: async () => {
                        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                        try {
                            const response = await fetch(`${API_BASE}/api/study-groups/${groupId}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            const data = await response.json();
                            if (data.success) {
                                toast.success('Study group deleted successfully');
                                setSelectedGroup(null);
                                setSelectedChannel(null);
                                setMessages([]);
                                loadStudyGroups();
                                navigate('/study-rooms');
                            } else {
                                toast.error(data.message || 'Failed to delete group');
                            }
                        } catch (error) {
                            console.error('Error deleting group:', error);
                            toast.error('Failed to delete group');
                        } finally {
                            setConfirmationDialog(null);
                        }
                    },
                    onCancel: () => {
                        setConfirmationDialog(null);
                    }
                });
            },
            onCancel: () => {
                setConfirmationDialog(null);
            }
        });
    };

    // Load join requests when group is selected and user is owner/admin
    useEffect(() => {
        if (selectedGroup && groupId && (isCurrentUserOwner() || isCurrentUserAdmin())) {
            loadJoinRequests();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedGroup, groupId]);

    // Close member menu and settings menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (selectedMemberMenu && !e.target.closest('.member-menu-container')) {
                setSelectedMemberMenu(null);
            }
            if (showGroupSettings && settingsMenuRef.current && !settingsMenuRef.current.contains(e.target)) {
                setShowGroupSettings(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [selectedMemberMenu, showGroupSettings]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 flex flex-col">
            <DashboardNavbar />

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Study Groups */}
                <div className="w-64 bg-gray-900 text-white flex flex-col">
                    <div className="p-4 border-b border-gray-800">
                        <h2 className="text-lg font-bold mb-4">Study Groups</h2>
                        <button
                            onClick={() => setShowCreateGroup(true)}
                            className="w-full flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                        >
                            <Plus size={18} />
                            <span>Create Group</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {studyGroups.map((group) => (
                            <div
                                key={group._id}
                                onClick={() => {
                                    setSelectedGroup(group);
                                    navigate(`/study-rooms/${group._id}`);
                                }}
                                className={`p-3 cursor-pointer hover:bg-gray-800 transition-colors ${selectedGroup?._id === group._id ? 'bg-gray-800 border-l-4 border-purple-500' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    {group.icon ? (
                                        <img src={group.icon} alt={group.name} className="w-8 h-8 rounded-full" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                                            {group.name[0]?.toUpperCase()}
                                        </div>
                                    )}
                                    <span className="font-medium truncate">{group.name}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Middle Sidebar - Channels */}
                {selectedGroup && (
                    <div className="w-64 bg-gray-800 text-white flex flex-col">
                        <div className="p-4 border-b border-gray-700">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-sm uppercase text-gray-400">{selectedGroup.name}</h3>
                                <div className="flex items-center gap-1">
                                    {(isCurrentUserOwner() || isCurrentUserAdmin()) && (
                                        <>
                                            <button
                                                onClick={() => setShowJoinRequests(true)}
                                                className="text-gray-400 hover:text-white relative"
                                                title="Join Requests"
                                            >
                                                <Mail size={16} />
                                                {joinRequests.filter(r => r.status === 'pending').length > 0 && (
                                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                                                        {joinRequests.filter(r => r.status === 'pending').length}
                                                    </span>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => setShowCreateChannel(true)}
                                                className="text-gray-400 hover:text-white"
                                                title="Create Channel"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </>
                                    )}
                                    <div className="relative" ref={settingsMenuRef}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowGroupSettings(!showGroupSettings);
                                            }}
                                            className="text-gray-400 hover:text-white"
                                            title="Group Settings"
                                        >
                                            <Settings size={16} />
                                        </button>
                                        {/* Group Settings Menu */}
                                        {showGroupSettings && (
                                            <div 
                                                className="absolute right-0 top-full mt-2 bg-gray-900 rounded-lg border border-gray-700 py-1 min-w-[180px] z-50 shadow-xl"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {isCurrentUserMember() && !isCurrentUserOwner() && (
                                                    <button
                                                        onClick={() => {
                                                            setShowGroupSettings(false);
                                                            handleLeaveGroup();
                                                        }}
                                                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 text-red-400 flex items-center gap-2"
                                                    >
                                                        <LogOut size={14} />
                                                        Leave Group
                                                    </button>
                                                )}
                                                {isCurrentUserOwner() && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setShowGroupSettings(false);
                                                                handleLeaveGroup();
                                                            }}
                                                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 text-yellow-400 flex items-center gap-2"
                                                        >
                                                            <LogOut size={14} />
                                                            Leave Group
                                                        </button>
                                                        <div className="border-t border-gray-700 my-1"></div>
                                                        <button
                                                            onClick={() => {
                                                                setShowGroupSettings(false);
                                                                handleDeleteGroup();
                                                            }}
                                                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 text-red-400 flex items-center gap-2"
                                                        >
                                                            <Trash2 size={14} />
                                                            Delete Group
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Show join type badge */}
                            <div className="flex items-center gap-2 mt-2">
                                {selectedGroup.joinType === 'public' && (
                                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                                        <Globe size={12} />
                                        Public
                                    </span>
                                )}
                                {selectedGroup.joinType === 'invite-only' && (
                                    <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded flex items-center gap-1">
                                        <Lock size={12} />
                                        Invite Only
                                    </span>
                                )}
                                {selectedGroup.joinType === 'request-to-join' && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded flex items-center gap-1">
                                        <UserPlus size={12} />
                                        Request to Join
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            <div className="mb-2">
                                <p className="text-xs font-semibold text-gray-400 uppercase px-2 mb-1">Text Channels</p>
                                {selectedGroup.channels
                                    ?.filter(c => c.type === 'text')
                                    .map((channel) => (
                                        <div
                                            key={channel._id}
                                            onClick={() => navigate(`/study-rooms/${groupId}/${channel._id}`)}
                                            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-700 ${selectedChannel?._id?.toString() === channel._id?.toString() ? 'bg-gray-700' : ''
                                                }`}
                                        >
                                            <Hash size={16} className="text-gray-400" />
                                            <span className="text-sm">{channel.name}</span>
                                        </div>
                                    ))}
                            </div>

                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase px-2 mb-1">Voice Channels</p>
                                {selectedGroup.channels
                                    ?.filter(c => c.type === 'voice')
                                    .map((channel) => (
                                        <div
                                            key={channel._id}
                                            className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-700"
                                        >
                                            <Mic size={16} className="text-gray-400" />
                                            <span className="text-sm">{channel.name}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-700">
                            <div className="flex items-center gap-2">
                                {(() => {
                                    const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
                                    const member = selectedGroup.members?.find(m => m.user._id === currentUser._id || m.user === currentUser._id);
                                    return member?.user?.profilePicture ? (
                                        <img src={member.user.profilePicture} alt="Profile" className="w-8 h-8 rounded-full" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                                            {currentUser.username?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                    );
                                })()}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {(() => {
                                            const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
                                            return currentUser.username || currentUser.email?.split('@')[0] || 'User';
                                        })()}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">
                                        {(() => {
                                            const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
                                            return currentUser.email || '';
                                        })()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                {selectedChannel ? (
                    <div className="flex-1 flex flex-col bg-gray-700">
                        {/* Channel Header */}
                        <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center px-4">
                            <Hash size={20} className="text-gray-400 mr-2" />
                            <h2 className="font-semibold text-white">{selectedChannel.name}</h2>
                            {selectedChannel.description && (
                                <span className="text-sm text-gray-400 ml-2">{selectedChannel.description}</span>
                            )}
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((message) => (
                                <div key={message._id} className="flex gap-3 hover:bg-gray-800/50 p-2 rounded">
                                    {message.sender?.profilePicture ? (
                                        <img src={message.sender.profilePicture} alt="Avatar" className="w-10 h-10 rounded-full" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                                            {message.sender?.username?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-white">{message.sender?.username || 'User'}</span>
                                            <span className="text-xs text-gray-400">
                                                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-gray-300">{message.content}</p>
                                        {message.fileUrl && (
                                            <img src={message.fileUrl} alt="Attachment" className="mt-2 max-w-md rounded-lg" />
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <form onSubmit={handleSendMessage} className="p-4 bg-gray-800">
                            <div className="flex items-center gap-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    className="hidden"
                                    onChange={() => { }}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 text-gray-400 hover:text-white"
                                >
                                    <ImageIcon size={20} />
                                </button>
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    placeholder={`Message #${selectedChannel.name}`}
                                    className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <button
                                    type="submit"
                                    disabled={!messageInput.trim() || sending}
                                    className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : selectedGroup ? (
                    <div className="flex-1 flex items-center justify-center bg-gray-700">
                        <div className="text-center text-gray-400">
                            {!isCurrentUserMember() ? (
                                <>
                                    <Lock size={64} className="mx-auto mb-4 opacity-50" />
                                    <p className="text-lg mb-2">You are not a member of this group</p>
                                    {selectedGroup.joinType === 'request-to-join' && (
                                        <button
                                            onClick={handleRequestToJoin}
                                            className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                                        >
                                            Request to Join
                                        </button>
                                    )}
                                    {selectedGroup.joinType === 'invite-only' && (
                                        <p className="text-sm mt-2">This group is invite-only. Ask for an invite code.</p>
                                    )}
                                    {selectedGroup.joinType === 'public' && (
                                        <button
                                            onClick={async () => {
                                                const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                                                try {
                                                    const response = await fetch(`${API_BASE}/api/study-groups/join`, {
                                                        method: 'POST',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            'Authorization': `Bearer ${token}`
                                                        },
                                                        body: JSON.stringify({ groupId: selectedGroup._id })
                                                    });
                                                    const data = await response.json();
                                                    if (data.success) {
                                                        toast.success('Joined group successfully!');
                                                        loadStudyGroup(selectedGroup._id);
                                                        loadStudyGroups();
                                                    } else {
                                                        toast.error(data.message || 'Failed to join group');
                                                    }
                                                } catch (error) {
                                                    console.error('Error joining group:', error);
                                                    toast.error('Failed to join group');
                                                }
                                            }}
                                            className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                                        >
                                            Join Group
                                        </button>
                                    )}
                                </>
                            ) : (
                                <>
                                    <MessageSquare size={64} className="mx-auto mb-4 opacity-50" />
                                    <p className="text-lg">Select a channel to start chatting</p>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-gray-700">
                        <div className="text-center text-gray-400">
                            <MessageSquare size={64} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg">Select a group to get started</p>
                        </div>
                    </div>
                )}

                {/* Right Sidebar - Members */}
                {selectedGroup && isCurrentUserMember() && (
                    <div className="w-64 bg-gray-800 text-white flex flex-col">
                        <div className="p-4 border-b border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users size={18} />
                                    <span className="font-semibold">Members — {selectedGroup.members?.length || 0}</span>
                                </div>
                                {(isCurrentUserOwner() || isCurrentUserAdmin()) && (
                                    <button
                                        onClick={() => setShowInviteModal(true)}
                                        className="text-gray-400 hover:text-white"
                                        title="Invite Member"
                                    >
                                        <UserPlus size={18} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {selectedGroup.members?.map((member) => {
                                const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
                                const currentUserId = currentUser._id || currentUser.id;
                                const memberId = (member.user?._id || member.user)?.toString();
                                const isOwner = (selectedGroup.owner?._id || selectedGroup.owner)?.toString() === memberId;
                                const isCurrentUser = memberId === currentUserId?.toString();
                                const adminRole = selectedGroup.roles?.find(r => r.name === 'Admin');
                                const isAdmin = member.roles?.some(r => r.toString() === adminRole?._id?.toString());
                                const canManage = isCurrentUserOwner() || (isCurrentUserAdmin() && !isOwner && !isAdmin);
                                
                                return (
                                    <div key={memberId} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-700 rounded relative group">
                                        {member.user?.profilePicture ? (
                                            <img src={member.user.profilePicture} alt="Avatar" className="w-8 h-8 rounded-full" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                                                {member.user?.username?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm truncate">{member.user?.username || member.user?.email?.split('@')[0] || 'User'}</span>
                                                {isOwner && <Crown size={14} className="text-yellow-500" />}
                                                {isAdmin && !isOwner && <Shield size={14} className="text-blue-500" />}
                                            </div>
                                        </div>
                                        {canManage && !isCurrentUser && (
                                            <div className="relative member-menu-container">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedMemberMenu(selectedMemberMenu === memberId ? null : memberId);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded transition-opacity"
                                                >
                                                    <MoreVertical size={14} />
                                                </button>
                                                {selectedMemberMenu === memberId && (
                                                    <div 
                                                        className="absolute right-0 top-full mt-1 bg-gray-900 rounded-lg shadow-xl border border-gray-700 min-w-[150px] z-50 py-1"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {isCurrentUserOwner() && !isAdmin && (
                                                            <button
                                                                onClick={() => handleMakeAdmin(memberId)}
                                                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2"
                                                            >
                                                                <Shield size={14} />
                                                                Make Admin
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleRemoveMember(memberId)}
                                                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 text-red-400 flex items-center gap-2"
                                                        >
                                                            <Trash2 size={14} />
                                                            Remove
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
                )}
            </div>

            {/* Create Group Modal */}
            {showCreateGroup && (
                <CreateGroupModal
                    onClose={() => setShowCreateGroup(false)}
                    onSubmit={handleCreateGroup}
                />
            )}

            {/* Create Channel Modal */}
            {showCreateChannel && (
                <CreateChannelModal
                    onClose={() => setShowCreateChannel(false)}
                    onSubmit={handleCreateChannel}
                />
            )}

            {/* Join Requests Modal */}
            {showJoinRequests && selectedGroup && (
                <JoinRequestsModal
                    onClose={() => setShowJoinRequests(false)}
                    requests={joinRequests}
                    loading={loadingRequests}
                    onApprove={handleApproveRequest}
                    onReject={handleRejectRequest}
                    onRefresh={loadJoinRequests}
                />
            )}

            {/* Invite Member Modal */}
            {showInviteModal && (
                <InviteMemberModal
                    onClose={() => setShowInviteModal(false)}
                    onInvite={handleInviteMember}
                />
            )}

            {/* Confirmation Dialog */}
            {confirmationDialog && (
                <ConfirmationDialog
                    title={confirmationDialog.title}
                    message={confirmationDialog.message}
                    confirmText={confirmationDialog.confirmText}
                    cancelText={confirmationDialog.cancelText}
                    type={confirmationDialog.type}
                    onConfirm={confirmationDialog.onConfirm}
                    onCancel={confirmationDialog.onCancel}
                />
            )}
        </div>
    );
};

// Create Group Modal Component
const CreateGroupModal = ({ onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'General',
        tags: '',
        isPublic: false,
        joinType: 'public'
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            return;
        }
        setLoading(true);
        try {
            await onSubmit({
                ...formData,
                tags: formData.tags.split(',').map(t => t.trim()).filter(t => t)
            });
        } catch (error) {
            console.error('Error creating group:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Create Study Group</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Group Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="Enter study group name"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe what this study group is about..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 resize-none"
                            rows="3"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Category</label>
                        <input
                            type="text"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            placeholder="e.g., Mathematics, Computer Science"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Tags (comma-separated)</label>
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            placeholder="e.g., programming, math, physics"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">Join Type *</label>
                        <select
                            value={formData.joinType}
                            onChange={(e) => setFormData({ ...formData, joinType: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                        >
                            <option value="public">Public - Anyone can join</option>
                            <option value="request-to-join">Request to Join - Requires approval</option>
                            <option value="invite-only">Invite Only - Invite code required</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            {formData.joinType === 'public' && 'Anyone can join this group directly'}
                            {formData.joinType === 'request-to-join' && 'Users must request to join and be approved'}
                            {formData.joinType === 'invite-only' && 'Users need an invite code to join'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={formData.isPublic}
                            onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                            className="w-4 h-4"
                        />
                        <label className="text-sm text-gray-700 cursor-pointer">Make this group visible in search</label>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !formData.name.trim()}
                            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Creating...</span>
                                </>
                            ) : (
                                'Create'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Create Channel Modal Component
const CreateChannelModal = ({ onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        name: '',
        type: 'text',
        description: '',
        isPrivate: false
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-700">Create Channel</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Channel Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Channel Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                        >
                            <option value="text">Text Channel</option>
                            <option value="voice">Voice Channel</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 resize-none"
                            rows="2"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={formData.isPrivate}
                            onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                            className="w-4 h-4"
                        />
                        <label className="text-sm text-gray-700">Private Channel</label>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        >
                            Create
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Join Requests Modal Component
const JoinRequestsModal = ({ onClose, requests, loading, onApprove, onReject, onRefresh }) => {
    const pendingRequests = requests.filter(r => r.status === 'pending');
    
    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Join Requests</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>
                
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                    </div>
                ) : pendingRequests.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Mail size={48} className="mx-auto mb-2 opacity-50" />
                        <p>No pending join requests</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto space-y-3">
                        {pendingRequests.map((request) => (
                            <div key={request._id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start gap-3 mb-3">
                                    {request.user?.profilePicture ? (
                                        <img src={request.user.profilePicture} alt="Avatar" className="w-10 h-10 rounded-full" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white">
                                            {request.user?.username?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900">{request.user?.username || request.user?.email?.split('@')[0] || 'User'}</p>
                                        <p className="text-sm text-gray-500">{request.user?.email}</p>
                                        {request.message && (
                                            <p className="text-sm text-gray-700 mt-2">{request.message}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onApprove(request._id)}
                                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle size={16} />
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => onReject(request._id)}
                                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <XCircle size={16} />
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                        onClick={onRefresh}
                        className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            </div>
        </div>
    );
};

// Invite Member Modal Component
const InviteMemberModal = ({ onClose, onInvite }) => {
    const [userEmail, setUserEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userEmail.trim()) return;
        setLoading(true);
        try {
            await onInvite(userEmail.trim());
        } catch (error) {
            console.error('Error inviting member:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-700">Invite Member</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">User Email *</label>
                        <input
                            type="email"
                            value={userEmail}
                            onChange={(e) => setUserEmail(e.target.value)}
                            required
                            placeholder="Enter user email"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !userEmail.trim()}
                            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Inviting...</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus size={16} />
                                    <span>Invite</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Confirmation Dialog Component
const ConfirmationDialog = ({ title, message, confirmText, cancelText, type = 'warning', onConfirm, onCancel }) => {
    const getTypeStyles = () => {
        switch (type) {
            case 'danger':
                return {
                    confirmBg: 'bg-red-600 hover:bg-red-700',
                    confirmText: 'text-white',
                    icon: 'text-red-600',
                    iconBg: 'bg-red-100'
                };
            case 'warning':
                return {
                    confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
                    confirmText: 'text-white',
                    icon: 'text-yellow-600',
                    iconBg: 'bg-yellow-100'
                };
            default:
                return {
                    confirmBg: 'bg-purple-600 hover:bg-purple-700',
                    confirmText: 'text-white',
                    icon: 'text-purple-600',
                    iconBg: 'bg-purple-100'
                };
        }
    };

    const styles = getTypeStyles();
    const Icon = type === 'danger' ? Trash2 : type === 'warning' ? XCircle : CheckCircle;

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={onCancel}
        >
            <div
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-4 mb-4">
                    <div className={`${styles.iconBg} p-3 rounded-full flex-shrink-0`}>
                        <Icon size={24} className={styles.icon} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
                        <p className="text-gray-600">{message}</p>
                    </div>
                </div>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors font-medium"
                    >
                        {cancelText || 'Cancel'}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 ${styles.confirmBg} ${styles.confirmText} rounded-lg transition-colors font-medium`}
                    >
                        {confirmText || 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudyRooms;

