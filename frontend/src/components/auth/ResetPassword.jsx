import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './ResetPassword.css';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [passwords, setPasswords] = useState({
        password: '',
        confirmPassword: ''
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!token) {
            navigate('/forgot-password');
        }
    }, [token, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (passwords.password !== passwords.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await axios.post(
                `http://localhost:5000/api/auth/reset-password/${token}`,
                { password: passwords.password }
            );
            
            setMessage(response.data.message);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="reset-password-form">
                <h2>Set New Password</h2>
                
                {message && <div className="success-message">{message}</div>}
                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="password">New Password</label>
                        <input
                            type="password"
                            id="password"
                            value={passwords.password}
                            onChange={(e) => setPasswords({...passwords, password: e.target.value})}
                            placeholder="Enter new password"
                            required
                            minLength="6"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={passwords.confirmPassword}
                            onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})}
                            placeholder="Confirm new password"
                            required
                            minLength="6"
                        />
                    </div>

                    <button 
                        type="submit" 
                        className="submit-btn" 
                        disabled={loading}
                    >
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>

                <div className="auth-links">
                    <Link to="/login">Back to Login</Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;