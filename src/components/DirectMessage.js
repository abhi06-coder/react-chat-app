import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, addDoc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import ChatMessage from './ChatMessage';

export default function DirectMessage({ friend, userProfile }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [uploading, setUploading] = useState(false);
    const mediaRecorder = useRef(null);
    const dummy = useRef();
    const myUid = auth.currentUser.uid;
    const friendUid = friend.id;
    const chatRoomId = myUid < friendUid ? `${myUid}_${friendUid}` : `${friendUid}_${myUid}`;

    useEffect(() => {
        const messagesRef = collection(db, `directMessages/${chatRoomId}/messages`);
        const q = query(messagesRef, orderBy('createdAt'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
        });
        return () => unsubscribe();
    }, [chatRoomId]);

    useEffect(() => {
        dummy.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (content) => {
        const messagesRef = collection(db, `directMessages/${chatRoomId}/messages`);
        await addDoc(messagesRef, {
            ...content,
            createdAt: new Date(),
            uid: myUid,
            displayName: userProfile.displayName,
        });
    };

    const handleTextSubmit = (e) => {
        e.preventDefault();
        if (newMessage.trim() === '') return;
        sendMessage({ text: newMessage });
        setNewMessage('');
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const storageRef = ref(storage, `uploads/${chatRoomId}/${Date.now()}_${file.name}`);
        try {
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            sendMessage({ imageUrl: url });
        } catch (error) {
            console.error("Upload failed:", error);
        }
        setUploading(false);
    };

    const toggleRecording = async () => {
        if (isRecording) {
            mediaRecorder.current.stop();
            setIsRecording(false);
        } else {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            const audioChunks = [];
            mediaRecorder.current.ondataavailable = event => audioChunks.push(event.data);
            mediaRecorder.current.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                setUploading(true);
                const storageRef = ref(storage, `uploads/${chatRoomId}/${Date.now()}_voice.webm`);
                try {
                    const snapshot = await uploadBytes(storageRef, audioBlob);
                    const url = await getDownloadURL(snapshot.ref);
                    sendMessage({ voiceUrl: url });
                } catch (error) {
                    console.error("Voice upload failed:", error);
                }
                setUploading(false);
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorder.current.start();
            setIsRecording(true);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full">
            <div className="bg-gray-800 p-3 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-center">Chat with {friend.displayName}</h2>
            </div>
            <main className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map(msg => <ChatMessage key={msg.id} message={msg} currentUser={auth.currentUser} />)}
                <div ref={dummy}></div>
            </main>
            {uploading && <div className="p-2 text-center text-sm text-gray-400">Uploading...</div>}
            <form onSubmit={handleTextSubmit} className="bg-gray-800 p-4 flex items-center gap-2">
                <input type="file" id="image-upload" className="hidden" onChange={handleFileUpload} accept="image/*" />
                <label htmlFor="image-upload" className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full cursor-pointer">
                    {/* Image Icon */}
                    <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l-1.586-1.586a2 2 0 00-2.828 0L6 14m6-6l.01.01" /></svg>
                </label>
                <button type="button" onClick={toggleRecording} className={`p-3 rounded-full ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-gray-700 hover:bg-gray-600'}`}>
                    {/* Mic Icon */}
                    <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </button>
                <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Message ${friend.displayName}...`}
                    className="flex-1 bg-gray-700 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                />
                <button type="submit" disabled={!newMessage.trim()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full disabled:opacity-50">
                    Send
                </button>
            </form>
        </div>
    );
}
