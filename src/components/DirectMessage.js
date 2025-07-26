import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, addDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import ChatMessage from './ChatMessage';

// Accept onStartCall as a new prop
export default function DirectMessage({ friend, userProfile, onStartCall }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const dummy = useRef();
    const myUid = auth.currentUser.uid;
    const friendUid = friend.id;

    useEffect(() => {
        const chatRoomId = myUid < friendUid ? `${myUid}_${friendUid}` : `${friendUid}_${myUid}`;
        const messagesRef = collection(db, `directMessages/${chatRoomId}/messages`);
        const q = query(messagesRef, orderBy('createdAt'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const msgs = [];
            querySnapshot.forEach((doc) => {
                msgs.push({ id: doc.id, ...doc.data() });
            });
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [friendUid, myUid]);

    useEffect(() => {
        dummy.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '') return;
        const chatRoomId = myUid < friendUid ? `${myUid}_${friendUid}` : `${friendUid}_${myUid}`;
        const messagesRef = collection(db, `directMessages/${chatRoomId}/messages`);
        try {
            await addDoc(messagesRef, {
                text: newMessage,
                createdAt: new Date(),
                uid: myUid,
                displayName: userProfile.displayName,
            });
            setNewMessage('');
        } catch (error) {
            console.error("Error sending direct message:", error);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full">
            {/* Header with Call Button */}
            <div className="bg-gray-800 p-3 flex justify-between items-center border-b border-gray-700">
                <h2 className="text-lg font-semibold">Chat with {friend.displayName}</h2>
                <div className="flex gap-3">
                    {/* The onStartCall function will now implicitly mean audio */}
                    <button onClick={onStartCall} className="bg-green-600 hover:bg-green-700 p-2 rounded-full flex items-center gap-2 px-4">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="font-semibold">Call</span>
                    </button>
                </div>
            </div>
            
            <main className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map(msg => <ChatMessage key={msg.id} message={msg} currentUser={auth.currentUser} />)}
                <div ref={dummy}></div>
            </main>

            <form onSubmit={sendMessage} className="bg-gray-800 p-4 flex items-center">
                <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Message ${friend.displayName}...`}
                    className="flex-1 bg-gray-700 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                />
                <button type="submit" disabled={!newMessage.trim()} className="ml-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200">
                    Send
                </button>
            </form>
        </div>
    );
}
