import React, { useRef, useEffect } from 'react';

export default function ChatMessage({ message, currentUser, onMessageVisible }) {
    const { text, uid, displayName, createdAt, imageUrl, voiceUrl } = message;
    const messageClass = uid === currentUser.uid ? 'sent' : 'received';
    const messageRef = useRef();

    useEffect(() => {
        if (!onMessageVisible) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    onMessageVisible(message);
                    if (messageRef.current) observer.unobserve(messageRef.current);
                }
            },
            { threshold: 1.0 }
        );
        if (messageRef.current) observer.observe(messageRef.current);
        return () => {
            if (messageRef.current) observer.unobserve(messageRef.current);
        };
    }, [message, onMessageVisible]);

    const renderTimestamp = () => {
        if (!createdAt || typeof createdAt.toDate !== 'function') return null;
        return createdAt.toDate().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const renderContent = () => {
        if (imageUrl) {
            return <img src={imageUrl} alt="Sent content" className="rounded-lg max-w-xs" />;
        }
        if (voiceUrl) {
            return <audio controls src={voiceUrl} className="w-64" />;
        }
        return <p className="text-base break-words">{text}</p>;
    };

    return (
        <div ref={messageRef} className={`flex items-start my-3 ${messageClass === 'sent' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex flex-col ${messageClass === 'sent' ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-xs font-medium text-gray-400">{displayName}</span>
                    <span className="text-xs text-gray-500">{renderTimestamp()}</span>
                </div>
                <div className={`p-2 rounded-lg ${messageClass === 'sent' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
