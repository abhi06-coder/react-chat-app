import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function FriendsPage({ userProfile, onSelectFriend }) {
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchError, setSearchError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);

    const myUid = auth.currentUser.uid;

    // Listener for Friend Requests
    useEffect(() => {
        const requestsRef = collection(db, `users/${myUid}/friendRequests`);
        const q = query(requestsRef, where("status", "==", "pending"));
        const unsubscribe = onSnapshot(q, snapshot => {
            const requests = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setFriendRequests(requests);
        });
        return () => unsubscribe();
    }, [myUid]);

    // Listener for Friends List
    useEffect(() => {
        const friendsRef = collection(db, `users/${myUid}/friends`);
        const unsubscribe = onSnapshot(friendsRef, snapshot => {
            const friendsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setFriends(friendsList);
        });
        return () => unsubscribe();
    }, [myUid]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchEmail.trim()) return;
        setLoading(true);
        setSearchError('');
        setSearchResults([]);
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where("email", "==", searchEmail.toLowerCase()));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                setSearchError('No user found with that email.');
            } else {
                const results = querySnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(user => user.id !== myUid); // Filter out myself
                setSearchResults(results);
            }
        } catch (err) {
            setSearchError('Failed to search for users.');
            console.error(err);
        }
        setLoading(false);
    };

    const sendFriendRequest = async (targetUser) => {
        const requestRef = doc(db, `users/${targetUser.id}/friendRequests/${myUid}`);
        try {
            await setDoc(requestRef, {
                displayName: userProfile.displayName,
                email: userProfile.email,
                status: 'pending',
                sentAt: new Date()
            });
            alert(`Friend request sent to ${targetUser.displayName}!`);
        } catch (err) {
            alert('Failed to send friend request.');
            console.error(err);
        }
    };
    
    const handleRequest = async (request, action) => {
        const requestRef = doc(db, `users/${myUid}/friendRequests/${request.id}`);
        try {
            if (action === 'accept') {
                // Add to my friends list
                await setDoc(doc(db, `users/${myUid}/friends/${request.id}`), {
                    displayName: request.displayName,
                    email: request.email,
                });
                // Add me to their friends list
                await setDoc(doc(db, `users/${request.id}/friends/${myUid}`), {
                    displayName: userProfile.displayName,
                    email: userProfile.email,
                });
                // Delete the request
                await deleteDoc(requestRef);
            } else { // Decline
                await deleteDoc(requestRef);
            }
        } catch (err) {
            console.error('Failed to handle request', err);
        }
    };


    return (
        <div className="p-4 md:p-8 text-white">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Friends List & Requests */}
                <div className="lg:col-span-1 space-y-8">
                    {/* Friend Requests */}
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h2 className="text-xl font-bold mb-4">Friend Requests</h2>
                        {friendRequests.length > 0 ? (
                            <div className="space-y-3">
                                {friendRequests.map(req => (
                                    <div key={req.id} className="flex justify-between items-center bg-gray-700 p-3 rounded-md">
                                        <span>{req.displayName}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleRequest(req, 'accept')} className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded-md text-xs">Accept</button>
                                            <button onClick={() => handleRequest(req, 'decline')} className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded-md text-xs">Decline</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-gray-400">No new requests.</p>}
                    </div>

                    {/* Friends List */}
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h2 className="text-xl font-bold mb-4">My Friends</h2>
                        {friends.length > 0 ? (
                            <div className="space-y-3">
                                {friends.map(friend => (
                                    <div key={friend.id} onClick={() => onSelectFriend(friend)} className="flex justify-between items-center bg-gray-700 p-3 rounded-md hover:bg-gray-600 cursor-pointer">
                                        <span>{friend.displayName}</span>
                                        <span className="text-xs text-green-400">Online</span>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-gray-400">You haven't added any friends yet.</p>}
                    </div>
                </div>

                {/* Right Column: Add Friends */}
                <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-xl font-bold mb-4">Add a Friend</h2>
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input
                            type="email"
                            value={searchEmail}
                            onChange={(e) => setSearchEmail(e.target.value)}
                            placeholder="Search by user's email"
                            className="flex-1 bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500"
                        />
                        <button type="submit" disabled={loading} className="font-medium bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-md disabled:opacity-50">
                            {loading ? '...' : 'Search'}
                        </button>
                    </form>

                    {searchError && <p className="text-red-400 text-center mt-4">{searchError}</p>}
                    
                    <div className="mt-6 space-y-3">
                        {searchResults.map(user => (
                            <div key={user.id} className="flex justify-between items-center bg-gray-700 p-4 rounded-md">
                                <div>
                                    <p className="font-semibold">{user.displayName}</p>
                                    <p className="text-sm text-gray-400">{user.email}</p>
                                </div>
                                <button onClick={() => sendFriendRequest(user)} className="font-medium bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md">
                                    Add Friend
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
