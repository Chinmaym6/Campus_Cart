import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from '../../utils/api';
import './LoginForm.css'; 

function LoginForm() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Axios is already configured in api.js

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await api.post(
                '/api/auth/login',
                {
                    email: form.email,
                    password: form.password
                }
            );

            console.log('Login successful:', response.data);

            // Store only non-sensitive user data in localStorage
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            // Navigate to dashboard
            navigate('/dashboard');

        } catch (err) {
            console.error('Login error:', err);
            
            if (err.response) {
                setError(err.response.data.message || "Invalid credentials");
            } else if (err.request) {
                setError("Cannot connect to server. Please check your connection.");
            } else {
                setError("An unexpected error occurred. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Check server connection on component mount
    useEffect(() => {
        const checkServer = async () => {
            try {
                await api.get('/api/health');
            } catch (err) {
                setError("Server connection failed. Please ensure the backend is running.");
            }
        };
        
        checkServer();
    }, []);

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="logo">🛒</div>
                    <h1>Campus Cart</h1>
                    <p>Welcome back to your campus community</p>
                </div>

                <div className="auth-form">
                    <h2>Sign In</h2>
                    {error && <div className="alert alert-error">{error}</div>}
                    
                    <form onSubmit={handleSubmit} className="form">
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input 
                                type="email" 
                                id="email"
                                placeholder="your.email@university.edu" 
                                value={form.email} 
                                onChange={(e) => setForm({...form, email: e.target.value})}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input 
                                type="password" 
                                id="password"
                                placeholder="Enter your password" 
                                value={form.password} 
                                onChange={(e) => setForm({...form, password: e.target.value})}
                                required
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-primary btn-full"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner"></span>
                                    Signing in...
                                </>
                            ) : (
                                "🔑 Sign In"
                            )}
                        </button>
                    </form>

                    <div className="auth-links">
                        <Link to="/forgot-password">Forgot Password?</Link>
                        <p>Don't have an account? <Link to="/register">Sign up</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginForm;
