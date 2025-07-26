import React, { useState } from 'react';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from 'firebase/auth';
import { auth } from '../firebase';

export default function Login() {
    const [isSigningUp, setIsSigningUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        setError(''); // Reset error before new attempt

        if (!email || !password) {
            setError("Please enter both email and password.");
            return;
        }

        try {
            if (isSigningUp) {
                // Create a new user
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                // Sign in existing user
                await signInWithEmailAndPassword(auth, email, password);
            }
            // On successful sign-in/up, the onAuthStateChanged listener in App.js will handle the rest.
        } catch (err) {
            // Provide user-friendly error messages
            if (err.code === 'auth/email-already-in-use') {
                setError('This email address is already in use. Try signing in.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password should be at least 6 characters.');
            } else if (err.code === 'auth/invalid-credential') {
                setError('Invalid email or password. Please check your credentials.');
            } 
            else {
                setError('Failed to authenticate. Please try again.');
            }
            console.error("Authentication error:", err);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-white mb-6">
                    {isSigningUp ? 'Create Account' : 'Welcome Back'}
                </h2>
                <form onSubmit={handleAuth} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="mt-1 block w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm py-3 px-4 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="mt-1 block w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm py-3 px-4 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    <div>
                        <button
                            type="submit"
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900"
                        >
                            {isSigningUp ? 'Sign Up' : 'Sign In'}
                        </button>
                    </div>
                </form>
                <div className="text-center mt-6">
                    <button
                        onClick={() => {
                            setIsSigningUp(!isSigningUp);
                            setError(''); // Clear errors when switching modes
                        }}
                        className="text-sm text-blue-400 hover:text-blue-300"
                    >
                        {isSigningUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
}
