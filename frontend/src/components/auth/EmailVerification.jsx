import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import './EmailVerification.css';

const EmailVerification = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying');
    const [message, setMessage] = useState('Verifying your email...');

    useEffect(() => {
        const verifyEmail = async () => {
            try {
                const response = await api.get(`/api/auth/verify-email/${token}`);
                setStatus('success');
                setMessage(response.data.message || 'Email verified successfully!');
                
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Verification failed. Please try again.');
            }
        };

        if (token) {
            verifyEmail();
        } else {
            setStatus('error');
            setMessage('Invalid verification link.');
        }
    }, [token, navigate]);

    return (
        <div className="verification-container">
            <div className="verification-card">
                <div className={`verification-icon ${status}`}>
                    {status === 'verifying' && '⌛'}
                    {status === 'success' && '✅'}
                    {status === 'error' && '❌'}
                </div>
                <h2 className="verification-title">Email Verification</h2>
                <p className={`verification-message ${status}`}>{message}</p>
                {status === 'error' && (
                    <button 
                        className="verification-button"
                        onClick={() => navigate('/login')}
                    >
                        Back to Login
                    </button>
                )}
            </div>
        </div>
    );
};

export default EmailVerification;