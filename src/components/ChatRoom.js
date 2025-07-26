import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, onSnapshot, addDoc, orderBy, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import ChatMessage from './ChatMessage';

export default function ChatRoom({ user, userProfile, currentRoom }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const dummy = useRef();

    // Effect to listen for messages and filter them based on the new logic
    useEffect(() => {
        if (!currentRoom?.id) return;
        const messagesRef = collection(db, `rooms/${currentRoom.id}/messages`);
        const q = query(messagesRef, orderBy('createdAt'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const allMessages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // **NEW LOGIC:** Filter out messages that the current user has "deleted" by leaving the room.
            const visibleMessages = allMessages.filter(msg => !msg.deletedFor?.includes(user.uid));
            
            setMessages(visibleMessages);
        });
        return () => unsubscribe();
    }, [currentRoom?.id, user.uid]);

    useEffect(() => {
        dummy.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentRoom?.id) return;

        await addDoc(collection(db, `rooms/${currentRoom.id}/messages`), {
            text: newMessage,
            createdAt: new Date(),
            uid: user.uid,
            displayName: userProfile.displayName,
            // Initialize seenBy array with the sender's ID
            seenBy: [user.uid],
            // **NEW:** Initialize an empty array to track who has "deleted" the message.
            deletedFor: [],
        });
        setNewMessage('');
    };

    // This function is now only responsible for marking a message as "seen".
    const handleMessageVisible = useCallback(async (message) => {
        // Exit if the message has no seenBy field (old message) or if user has already seen it.
        if (!message.seenBy || message.seenBy.includes(user.uid)) {
            return;
        }

        const messageRef = doc(db, `rooms/${currentRoom.id}/messages`, message.id);

        try {
            // Add current user to the seenBy array in Firestore.
            // The deletion logic is now removed from here.
            await updateDoc(messageRef, {
                seenBy: arrayUnion(user.uid)
            });
        } catch (error) {
            // It's possible the message was deleted by another process, so we can ignore "not-found" errors.
            if (error.code !== 'not-found') {
                console.error("Error marking message as seen:", error);
            }
        }
    }, [user.uid, currentRoom?.id]);

    return (
        <div className="h-full flex flex-col bg-gray-900 text-white">
            <div className="flex-1 overflow-y-auto p-4">
                {messages.map((msg) => (
                    <ChatMessage 
                        key={msg.id} 
                        message={msg} 
                        currentUser={user} 
                        onMessageVisible={handleMessageVisible} // This still marks the message as seen
                    />
                ))}
                <div ref={dummy}></div>
            </div>
            <form onSubmit={sendMessage} className="flex items-center p-4 bg-gray-800 border-t border-gray-700">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 rounded-full px-4 py-2 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" disabled={!newMessage.trim()} className="ml-3 px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white font-semibold disabled:opacity-50">
                    Send
                </button>
            </form>
        </div>
    );
}
