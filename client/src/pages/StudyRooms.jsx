import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Hash, Plus, Settings, Users, Search, MessageSquare, Mic, Volume2,
    Crown, Shield, User, LogOut, X, Edit2, Trash2, Send, Image as ImageIcon,
    BookOpen, Calendar, Tag, Globe, Lock, Loader2
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
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

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
                if (message.channelId === selectedChannel._id || message.channelId === selectedChannel._id.toString()) {
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
                                <button
                                    onClick={() => setShowCreateChannel(true)}
                                    className="text-gray-400 hover:text-white"
                                    title="Create Channel"
                                >
                                    <Plus size={16} />
                                </button>
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
                                            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-700 ${selectedChannel?._id === channel._id ? 'bg-gray-700' : ''
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
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-gray-700">
                        <div className="text-center text-gray-400">
                            <MessageSquare size={64} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg">Select a channel to start chatting</p>
                        </div>
                    </div>
                )}

                {/* Right Sidebar - Members */}
                {selectedGroup && (
                    <div className="w-64 bg-gray-800 text-white flex flex-col">
                        <div className="p-4 border-b border-gray-700">
                            <div className="flex items-center gap-2">
                                <Users size={18} />
                                <span className="font-semibold">Members — {selectedGroup.members?.length || 0}</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {selectedGroup.members?.map((member) => {
                                const isOwner = selectedGroup.owner?._id === member.user?._id || selectedGroup.owner === member.user?._id;
                                return (
                                    <div key={member.user?._id || member.user} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-700 rounded">
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
                                            </div>
                                        </div>
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
        isPublic: false
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
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={formData.isPublic}
                            onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                            className="w-4 h-4"
                        />
                        <label className="text-sm text-gray-700 cursor-pointer">Make this group public</label>
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
                    <h2 className="text-2xl font-bold">Create Channel</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Channel Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Channel Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="text">Text Channel</option>
                            <option value="voice">Voice Channel</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                        <label className="text-sm">Private Channel</label>
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

export default StudyRooms;

