import React, { useRef, useEffect } from 'react';

export default function ChatMessage({ message, currentUser, onMessageVisible }) {
    const { text, uid, displayName, createdAt } = message;
    const messageClass = uid === currentUser.uid ? 'sent' : 'received';
    const messageRef = useRef();

    // This effect sets up an observer to check when the message is visible
    useEffect(() => {
        // **FIX:** If onMessageVisible is not provided (e.g., in a Direct Message), do nothing.
        if (!onMessageVisible) {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                // When the message component is intersecting with the viewport
                if (entry.isIntersecting) {
                    // Call the handler function passed from ChatRoom
                    onMessageVisible(message);
                    // We only need to know once, so we can stop observing
                    if (messageRef.current) {
                        observer.unobserve(messageRef.current);
                    }
                }
            },
            { threshold: 1.0 } // 1.0 means 100% of the element is visible
        );

        if (messageRef.current) {
            observer.observe(messageRef.current);
        }

        // Cleanup observer on unmount
        return () => {
            if (messageRef.current) {
                observer.unobserve(messageRef.current);
            }
        };
    }, [message, onMessageVisible]);

    const renderTimestamp = () => {
        if (!createdAt || typeof createdAt.toDate !== 'function') return null;
        return createdAt.toDate().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    return (
        // Attach the ref to the root div of the component
        <div ref={messageRef} className={`flex items-start my-3 ${messageClass === 'sent' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex flex-col ${messageClass === 'sent' ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-xs font-medium text-gray-400">{displayName}</span>
                    <span className="text-xs text-gray-500">{renderTimestamp()}</span>
                </div>
                <div className={`px-4 py-2 rounded-lg max-w-xs md:max-w-md ${messageClass === 'sent' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                    <p className="text-base break-words">{text}</p>
                </div>
            </div>
        </div>
    );
}
