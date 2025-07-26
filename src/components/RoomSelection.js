import React, { useState } from 'react';
import { collection, addDoc, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function RoomSelection({ onRoomSelect, userProfile, onLogout, onEditProfile }) {
    const [newRoomName, setNewRoomName] = useState('');
    const [joinRoomId, setJoinRoomId] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        if (!newRoomName.trim()) {
            setError('Please enter a room name.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const roomsCollectionRef = collection(db, 'rooms');
            const newRoomDoc = await addDoc(roomsCollectionRef, {
                name: newRoomName,
                createdAt: new Date(),
                createdBy: auth.currentUser.uid,
                // Initialize the members list with the creator
                memberIds: [auth.currentUser.uid]
            });
            onRoomSelect({ id: newRoomDoc.id, name: newRoomName });
        } catch (err) {
            setError('Failed to create room. Please try again.');
            console.error('Room creation error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRoom = async (e) => {
        e.preventDefault();
        if (!joinRoomId.trim()) {
            setError('Please enter a Room ID.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const roomDocRef = doc(db, 'rooms', joinRoomId);
            const roomDocSnap = await getDoc(roomDocRef);

            if (roomDocSnap.exists()) {
                onRoomSelect({ id: roomDocSnap.id, name: roomDocSnap.data().name });
            } else {
                setError('Room not found. Please check the ID and try again.');
            }
        } catch (err) {
            setError('Failed to join room. Please try again.');
            console.error('Room joining error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <header className="bg-gray-800 shadow-md p-4 flex justify-between items-center">
                <h1 className="text-xl font-bold text-blue-400">
                    Welcome, {userProfile?.displayName || 'User'}
                </h1>
                <div className="flex items-center gap-4">
                    <button onClick={onEditProfile} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md text-sm">
                        Edit Profile
                    </button>
                    <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md text-sm">
                        Logout
                    </button>
                </div>
            </header>

            <div className="flex flex-col items-center justify-center pt-12 md:pt-16">
                <div className="w-full max-w-4xl mx-auto p-4 md:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Create Room Section */}
                        <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
                            <h2 className="text-2xl font-bold text-center mb-6">Create a New Room</h2>
                            <form onSubmit={handleCreateRoom} className="space-y-4">
                                <div>
                                    <label htmlFor="roomName" className="block text-sm font-medium text-gray-300">Room Name</label>
                                    <input
                                        id="roomName"
                                        type="text"
                                        value={newRoomName}
                                        onChange={(e) => setNewRoomName(e.target.value)}
                                        placeholder="e.g., Project Alpha"
                                        className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500"
                                    />
                                </div>
                                <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 rounded-md shadow-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                                    {loading ? 'Creating...' : 'Create Room'}
                                </button>
                            </form>
                        </div>

                        {/* Join Room Section */}
                        <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
                            <h2 className="text-2xl font-bold text-center mb-6">Join an Existing Room</h2>
                            <form onSubmit={handleJoinRoom} className="space-y-4">
                                <div>
                                    <label htmlFor="roomId" className="block text-sm font-medium text-gray-300">Room ID</label>
                                    <input
                                        id="roomId"
                                        type="text"
                                        value={joinRoomId}
                                        onChange={(e) => setJoinRoomId(e.target.value)}
                                        placeholder="Enter Room ID"
                                        className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500"
                                    />
                                </div>
                                <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 rounded-md shadow-sm font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50">
                                    {loading ? 'Joining...' : 'Join Room'}
                                </button>
                            </form>
                        </div>
                    </div>
                    {error && <p className="text-red-400 text-sm text-center mt-8">{error}</p>}
                </div>

                <div className="w-full max-w-4xl mx-auto p-4 md:p-8 mt-8">
                    <h3 className="text-xl font-bold text-center text-gray-400 mb-4">Recently Joined Rooms</h3>
                    {userProfile?.roomHistory && userProfile.roomHistory.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-4">
                            {userProfile.roomHistory.map(room => (
                                <button
                                    key={room.id}
                                    onClick={() => onRoomSelect(room)}
                                    className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-200"
                                >
                                    {room.name}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500">You haven't joined any rooms yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
