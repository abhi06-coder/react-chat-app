import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

// Accept userProfile and onCancelEdit as new props
export default function ProfileSetup({ onProfileComplete, userProfile, onCancelEdit }) {
    const [formData, setFormData] = useState({
        firstName: '',
        surname: '',
        age: '',
        gender: 'Prefer not to say',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // This effect runs when the component loads.
    // If we are in "edit mode" (userProfile is provided), it populates the form.
    useEffect(() => {
        if (userProfile) {
            setFormData({
                firstName: userProfile.firstName || '',
                surname: userProfile.surname || '',
                age: userProfile.age || '',
                gender: userProfile.gender || 'Prefer not to say',
            });
        }
    }, [userProfile]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!formData.firstName || !formData.surname || !formData.age) {
            setError('Please fill out all required fields.');
            return;
        }

        setLoading(true);
        try {
            const user = auth.currentUser;
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);
                // Use updateDoc, which works for both creating and editing fields.
                await updateDoc(userDocRef, {
                    displayName: `${formData.firstName} ${formData.surname}`,
                    firstName: formData.firstName,
                    surname: formData.surname,
                    age: Number(formData.age),
                    gender: formData.gender,
                    profileComplete: true, 
                });
                // Notify App.js that the process is complete.
                onProfileComplete(); 
            }
        } catch (err) {
            setError('Failed to save profile. Please try again.');
            console.error('Profile update error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-lg">
                <h2 className="text-3xl font-bold text-center text-white mb-2">
                    {userProfile ? 'Edit Your Profile' : 'Complete Your Profile'}
                </h2>
                <p className="text-center text-gray-400 mb-6">
                    {userProfile ? 'Update your details below.' : "Let's get you set up for the chat."}
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-300">First Name</label>
                            <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500" />
                        </div>
                        <div>
                            <label htmlFor="surname" className="block text-sm font-medium text-gray-300">Surname</label>
                            <input type="text" name="surname" id="surname" value={formData.surname} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="age" className="block text-sm font-medium text-gray-300">Age</label>
                            <input type="number" name="age" id="age" value={formData.age} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500" />
                        </div>
                        <div>
                            <label htmlFor="gender" className="block text-sm font-medium text-gray-300">Gender</label>
                            <select name="gender" id="gender" value={formData.gender} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500">
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                                <option>Prefer not to say</option>
                            </select>
                        </div>
                    </div>
                    {error && <p className="text-red-400 text-sm text-center pt-2">{error}</p>}
                    <div className="flex items-center gap-4 pt-4">
                        {/* Show cancel button only in edit mode */}
                        {userProfile && (
                             <button type="button" onClick={onCancelEdit} className="w-full flex justify-center py-3 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700">
                                Cancel
                            </button>
                        )}
                        <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                            {loading ? 'Saving...' : 'Save and Continue'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
