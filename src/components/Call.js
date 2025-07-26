import React, { useEffect, useRef } from 'react';

// The component no longer needs video streams for the UI, only the controls and status.
// It receives friend and callStatus to display information.
export default function Call({ friend, onHangUp, isMuted, toggleMute, callStatus, localStream, remoteStream }) {
    // We still need audio elements to play the streams, but they will be hidden.
    const localAudioRef = useRef();
    const remoteAudioRef = useRef();

    // Effect to attach the local audio stream
    useEffect(() => {
        if (localAudioRef.current && localStream) {
            localAudioRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Effect to attach the remote audio stream
    useEffect(() => {
        if (remoteAudioRef.current && remoteStream) {
            remoteAudioRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);


    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50 text-white">
            {/* Hidden audio elements to handle the streams */}
            <audio ref={localAudioRef} autoPlay muted />
            <audio ref={remoteAudioRef} autoPlay />

            <div className="flex flex-col items-center justify-center text-center">
                {/* Placeholder for friend's avatar, using the first letter of their name */}
                <div className="w-40 h-40 bg-gray-700 rounded-full flex items-center justify-center mb-6 border-4 border-gray-600">
                    <span className="text-5xl font-semibold">{friend?.displayName?.charAt(0).toUpperCase() || '?'}</span>
                </div>
                
                <h2 className="text-4xl font-bold">
                    {friend?.displayName || 'Unknown Caller'}
                </h2>
                <p className="text-xl text-gray-400 mt-2">
                    {callStatus || 'Calling...'}
                </p>
            </div>


            {/* Call Controls */}
            <div className="absolute bottom-16 flex items-center gap-6">
                <button 
                    onClick={toggleMute}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-red-500' : 'bg-gray-600 hover:bg-gray-700'}`}
                >
                    {/* Mute/Unmute Icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {isMuted ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        ) : (
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        )}
                    </svg>
                </button>
                <button 
                    onClick={onHangUp}
                    className="w-20 h-20 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center"
                >
                    {/* Hang Up Icon */}
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" transform="rotate(135 12 12)" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
