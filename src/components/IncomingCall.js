import React from 'react';

/**
 * A component that displays a notification for an incoming call.
 * @param {object} props - The component's props.
 * @param {object} props.callData - Information about the incoming call, like the caller's name.
 * @param {Function} props.onAccept - The function to call when the user accepts the call.
 * @param {Function} props.onDecline - The function to call when the user declines the call.
 */
export default function IncomingCall({ callData, onAccept, onDecline }) {
    return (
        <div className="fixed bottom-5 right-5 bg-gray-800 p-6 rounded-lg shadow-2xl z-50 border border-blue-500 animate-pulse-slow">
            <p className="text-white mb-2 text-sm">Incoming Audio Call from...</p>
            <h3 className="text-2xl font-bold text-blue-400 mb-4">{callData.callerName}</h3>
            <div className="flex justify-end gap-4">
                <button 
                    onClick={onDecline} 
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-md font-semibold transition-colors"
                >
                    Decline
                </button>
                <button 
                    onClick={onAccept} 
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-md font-semibold transition-colors"
                >
                    Accept
                </button>
            </div>
        </div>
    );
}
