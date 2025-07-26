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
import Call from './components/Call';
import IncomingCall from './components/IncomingCall'; // Import the new notification component

// WebRTC Configuration
const servers = {
  iceServers: [ { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] } ],
  iceCandidatePoolSize: 10,
};
let pc = new RTCPeerConnection(servers);


export default function App() {
    // State Management
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [view, setView] = useState('rooms');
    const [dmFriend, setDmFriend] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [currentCall, setCurrentCall] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [callStatus, setCallStatus] = useState('');
    const [copyButtonText, setCopyButtonText] = useState('Copy ID');
    const [incomingCall, setIncomingCall] = useState(null); // State for the incoming call notification

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

    // Effect for listening to incoming calls
     useEffect(() => {
        if (!user) return;
        const callDocRef = doc(db, 'calls', user.uid);
        const unsubscribe = onSnapshot(callDocRef, (snapshot) => {
            const data = snapshot.data();
            if (data?.offer) {
                const callData = { ...data, id: user.uid };
                // Set state to show the notification component instead of window.confirm
                setIncomingCall(callData);
            }
        });
        return () => unsubscribe();
    }, [user]);

    // Function to handle joining a room
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
    
    // Function to handle leaving a room (with disappearing message logic)
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

    // Function to handle declining an incoming call
    const handleDeclineCall = async () => {
        if (incomingCall) {
            const callDocRef = doc(db, 'calls', incomingCall.id);
            await deleteDoc(callDocRef);
        }
        setIncomingCall(null);
    };

    // ... other handler functions (handleLogout, onProfileComplete, etc.) ...
    const handleLogout = async () => { await signOut(auth); };
    const onProfileComplete = async () => { setLoading(true); const userDocRef = doc(db, "users", user.uid); const userDocSnap = await getDoc(userDocRef); if(userDocSnap.exists()){ setUserProfile(userDocSnap.data()); } setIsEditingProfile(false); setLoading(false); };
    const handleSelectFriend = (friend) => { setDmFriend(friend); setView('friends'); };
    const handleCopyRoomId = () => { if (!currentRoom?.id) return; const textArea = document.createElement("textarea"); textArea.value = currentRoom.id; document.body.appendChild(textArea); textArea.focus(); textArea.select(); try { document.execCommand('copy'); setCopyButtonText('Copied!'); setTimeout(() => setCopyButtonText('Copy ID'), 2000); } catch (err) { console.error('Failed to copy Room ID: ', err); setCopyButtonText('Failed!'); setTimeout(() => setCopyButtonText('Copy ID'), 2000); } document.body.removeChild(textArea); };
    const handleStartCall = async () => {
           setCallStatus(`Calling ${dmFriend.displayName}...`);
           const callDocRef = doc(db, 'calls', dmFriend.id);
           const offerCandidates = collection(callDocRef, 'offerCandidates');
           const answerCandidates = collection(callDocRef, 'answerCandidates');
   
           pc.onicecandidate = event => {
               event.candidate && addDoc(offerCandidates, event.candidate.toJSON());
           };
   
           const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
           setLocalStream(stream);
           stream.getTracks().forEach(track => pc.addTrack(track, stream));
           
           const offerDescription = await pc.createOffer();
           await pc.setLocalDescription(offerDescription);
   
           const callPayload = {
               callerId: user.uid,
               callerName: userProfile.displayName,
               offer: {
                   sdp: offerDescription.sdp,
                   type: offerDescription.type,
               },
           };
   
           await setDoc(callDocRef, callPayload);
           setCurrentCall({ id: dmFriend.id, friend: dmFriend });
   
           onSnapshot(callDocRef, (snapshot) => {
               const data = snapshot.data();
               if (!pc.currentRemoteDescription && data?.answer) {
                   const answerDescription = new RTCSessionDescription(data.answer);
                   pc.setRemoteDescription(answerDescription);
                   setCallStatus(`On call with ${dmFriend.displayName}`);
               }
           });
   
           onSnapshot(answerCandidates, (snapshot) => {
               snapshot.docChanges().forEach((change) => {
                   if (change.type === 'added') {
                       pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                   }
               });
           });
           
           pc.ontrack = (event) => {
               setRemoteStream(event.streams[0]);
           };
       };
   
       const answerCall = async (callData) => {
           const friendProfile = { id: callData.callerId, displayName: callData.callerName };
           setCallStatus(`Connecting...`);
           const callDocRef = doc(db, 'calls', callData.callerId);
           const offerCandidates = collection(callDocRef, 'offerCandidates');
           const answerCandidates = collection(callDocRef, 'answerCandidates');
           
           pc.onicecandidate = event => {
               event.candidate && addDoc(answerCandidates, event.candidate.toJSON());
           };
           
           const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
           setLocalStream(stream);
           stream.getTracks().forEach(track => pc.addTrack(track, stream));
   
           await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
           
           const answerDescription = await pc.createAnswer();
           await pc.setLocalDescription(answerDescription);
   
           const answer = { type: answerDescription.type, sdp: answerDescription.sdp };
   
           await updateDoc(callDocRef, { answer });
           setCurrentCall({ id: callData.callerId, friend: friendProfile });
           setCallStatus(`On call with ${callData.callerName}`);
   
           onSnapshot(offerCandidates, (snapshot) => {
               snapshot.docChanges().forEach((change) => {
                   if (change.type === 'added') {
                       pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                   }
               });
           });
           
           pc.ontrack = (event) => {
               setRemoteStream(event.streams[0]);
           };
       };
   
       const hangUp = async () => {
           pc.close();
           const callIdToClean = currentCall?.id || dmFriend?.id;
           if (callIdToClean) {
               const callDocRef = doc(db, 'calls', callIdToClean);
               const offerCandidatesSnapshot = await getDocs(collection(callDocRef, 'offerCandidates'));
               offerCandidatesSnapshot.forEach(async (doc) => await deleteDoc(doc.ref));
               const answerCandidatesSnapshot = await getDocs(collection(callDocRef, 'answerCandidates'));
               answerCandidatesSnapshot.forEach(async (doc) => await deleteDoc(doc.ref));
               await deleteDoc(callDocRef).catch(() => {});
           }
           localStream?.getTracks().forEach(track => track.stop());
           setLocalStream(null);
           setRemoteStream(null);
           setCurrentCall(null);
           setCallStatus('');
           pc = new RTCPeerConnection(servers);
       };
       
       const toggleMute = () => {
           if (localStream) {
               localStream.getAudioTracks().forEach(track => {
                   track.enabled = !track.enabled;
                   setIsMuted(!track.enabled);
               });
           }
       };

    // Main render logic
    const renderMainContent = () => {
        if (currentCall) return <Call friend={currentCall.friend} localStream={localStream} remoteStream={remoteStream} onHangUp={hangUp} isMuted={isMuted} toggleMute={toggleMute} callStatus={callStatus} />;
        if (isEditingProfile) return <ProfileSetup userProfile={userProfile} onProfileComplete={onProfileComplete} onCancelEdit={() => setIsEditingProfile(false)} />;
        if (view === 'friends') {
            if (dmFriend) return <DirectMessage friend={dmFriend} userProfile={userProfile} onStartCall={handleStartCall} />;
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
                    {dmFriend && view === 'friends' && !currentCall && (<button onClick={() => setDmFriend(null)} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-md text-sm">Back to Friends</button>)}
                    {currentRoom && view === 'rooms' && (<button onClick={handleLeaveRoom} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-md text-sm">Leave Room</button>)}
                    <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md text-sm">Logout</button>
                </div>
            </header>
            <div className="flex-1 overflow-y-auto">{renderMainContent()}</div>

            {/* Conditionally render the IncomingCall component */}
            {incomingCall && (
                <IncomingCall 
                    callData={incomingCall} 
                    onAccept={() => {
                        answerCall(incomingCall);
                        setIncomingCall(null);
                    }} 
                    onDecline={handleDeclineCall} 
                />
            )}
        </div>
    );
}
