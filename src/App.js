import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, onSnapshot, deleteDoc, collection, addDoc, getDocs, arrayUnion, query, where, writeBatch } from 'firebase/firestore';
import { auth, db } from './firebase';

// Component Imports
import ChatRoom from './components/ChatRoom';
import Loader from './components/Loader';
import Login from './components/Login';
import ProfileSetup from './components/ProfileSetup';
import RoomSelection from './components/RoomSelection';
import FriendsPage from './components/FriendsPage';
import DirectMessage from './components/DirectMessage';
// Call components are no longer needed

export default function App() {
    // State Management (removed call-related states)
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [view, setView] = useState('rooms');
    const [dmFriend, setDmFriend] = useState(null);
    const [copyButtonText, setCopyButtonText] = useState('Copy ID');

    // Effect for handling user authentication
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setLoading(true);
            if (currentUser) {
                const userDocRef = doc(db, "users", currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    setUser(currentUser);
                    setUserProfile(userDocSnap.data());
                } else {
                    const basicProfile = { uid: currentUser.uid, email: currentUser.email, displayName: `NewUser-${currentUser.uid.substring(0, 5)}`, createdAt: new Date(), profileComplete: false, roomHistory: [] };
                    await setDoc(userDocRef, basicProfile);
                    setUser(currentUser);
                    setUserProfile(basicProfile);
                }
            } else {
                setUser(null); setUserProfile(null); setCurrentRoom(null); setDmFriend(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleRoomSelect = async (room) => {
        if (!user || !room) return;
        const roomDocRef = doc(db, "rooms", room.id);
        const userDocRef = doc(db, "users", user.uid);
        try {
            await updateDoc(roomDocRef, { memberIds: arrayUnion(user.uid) });
            const currentHistory = userProfile.roomHistory || [];
            const filteredHistory = currentHistory.filter(r => r.id !== room.id);
            const finalHistory = [room, ...filteredHistory].slice(0, 3);
            await setDoc(userDocRef, { roomHistory: finalHistory }, { merge: true });
            setUserProfile(prev => ({ ...prev, roomHistory: finalHistory }));
        } catch (error) {
            console.error("Failed to join room or update history:", error);
        }
        setCurrentRoom(room);
        setView('rooms');
    };
    
    const handleLeaveRoom = async () => {
        if (!currentRoom || !user) return;
        const messagesRef = collection(db, `rooms/${currentRoom.id}/messages`);
        const q = query(messagesRef, where('seenBy', 'array-contains', user.uid));
        try {
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            snapshot.forEach(doc => {
                batch.update(doc.ref, { deletedFor: arrayUnion(user.uid) });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error updating messages on leave:", error);
        }
        setCurrentRoom(null);
    };

    const handleLogout = async () => { await signOut(auth); };
    const onProfileComplete = async () => { setLoading(true); const userDocRef = doc(db, "users", user.uid); const userDocSnap = await getDoc(userDocRef); if(userDocSnap.exists()){ setUserProfile(userDocSnap.data()); } setIsEditingProfile(false); setLoading(false); };
    const handleSelectFriend = (friend) => { setDmFriend(friend); setView('friends'); };
    const handleCopyRoomId = () => { if (!currentRoom?.id) return; const textArea = document.createElement("textarea"); textArea.value = currentRoom.id; document.body.appendChild(textArea); textArea.focus(); textArea.select(); try { document.execCommand('copy'); setCopyButtonText('Copied!'); setTimeout(() => setCopyButtonText('Copy ID'), 2000); } catch (err) { console.error('Failed to copy Room ID: ', err); setCopyButtonText('Failed!'); setTimeout(() => setCopyButtonText('Copy ID'), 2000); } document.body.removeChild(textArea); };

    // Main render logic
    const renderMainContent = () => {
        if (isEditingProfile) return <ProfileSetup userProfile={userProfile} onProfileComplete={onProfileComplete} onCancelEdit={() => setIsEditingProfile(false)} />;
        if (view === 'friends') {
            if (dmFriend) return <DirectMessage friend={dmFriend} userProfile={userProfile} />;
            return <FriendsPage userProfile={userProfile} onSelectFriend={handleSelectFriend} />;
        }
        if (!currentRoom) return <RoomSelection onRoomSelect={handleRoomSelect} userProfile={userProfile} onLogout={handleLogout} onEditProfile={() => setIsEditingProfile(true)} />;
        return <ChatRoom user={user} userProfile={userProfile} currentRoom={currentRoom} />;
    };

    if (loading) return <Loader />;
    if (!user) return <Login />;
    if (!userProfile?.profileComplete) return <ProfileSetup onProfileComplete={onProfileComplete} />;

    return (
        <div className="font-sans bg-gray-900 text-white h-screen flex flex-col">
            <header className="bg-gray-800 shadow-md p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => { setView('rooms'); setDmFriend(null); }} className={`px-4 py-2 rounded-md text-sm font-semibold ${view === 'rooms' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>Chat Rooms</button>
                    <button onClick={() => setView('friends')} className={`px-4 py-2 rounded-md text-sm font-semibold ${view === 'friends' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>Friends</button>
                </div>
                {currentRoom && view === 'rooms' && (
                    <div className="flex-grow flex justify-center items-center gap-4">
                        <div className="text-center">
                            <h1 className="text-xl font-bold text-blue-400">Room: {currentRoom.name}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-md font-mono">{currentRoom.id}</p>
                                <button onClick={handleCopyRoomId} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1 px-3 rounded-md transition-all duration-200">
                                    {copyButtonText}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-4">
                    {dmFriend && view === 'friends' && (<button onClick={() => setDmFriend(null)} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-md text-sm">Back to Friends</button>)}
                    {currentRoom && view === 'rooms' && (<button onClick={handleLeaveRoom} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-md text-sm">Leave Room</button>)}
                    <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md text-sm">Logout</button>
                </div>
            </header>
            <div className="flex-1 overflow-y-auto">{renderMainContent()}</div>
        </div>
    );
}
