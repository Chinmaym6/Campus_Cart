import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import axios from 'axios';
import './LoginForm.css'; 

function LoginForm() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            console.log('Attempting to login...'); // Debug log
            
            // Add request configuration
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 5000 // 5 second timeout
            };

            const response = await axios.post(
                'http://localhost:5000/api/auth/login',
                {
                    email: form.email,
                    password: form.password
                },
                config
            );

            console.log('Login response:', response.data); // Debug log

            if (!response.data.token) {
                throw new Error('No token received from server');
            }

            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            navigate('/dashboard');

        } catch (err) {
            console.error('Login error:', err); // Debug log
            
            if (err.response) {
                // Server responded with error
                setError(err.response.data.message || "Invalid credentials");
            } else if (err.request) {
                // No response received
                setError("Cannot connect to server. Please check if the server is running.");
            } else {
                // Other errors
                setError("An unexpected error occurred. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Add connection check
    useEffect(() => {
        const checkServer = async () => {
            try {
                await axios.get('http://localhost:5000/api/health');
            } catch (err) {
                setError("Server connection failed. Please ensure the backend is running.");
            }
        };
        
        checkServer();
    }, []);

    return (
        <div className="auth-container">
            <div className="login-form">
                <h2>Welcome Back</h2>
                {error && <div className="error-message">{error}</div>}
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input 
                            type="email" 
                            id="email"
                            placeholder="Enter your email" 
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
                        className="submit-btn" 
                        disabled={loading}
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                <div className="auth-links">
                    <Link to="/forgot-password">Forgot Password?</Link>
                    <Link to="/register">Don't have an account? Sign up</Link>
                </div>
            </div>
        </div>
    );
}

export default LoginForm;