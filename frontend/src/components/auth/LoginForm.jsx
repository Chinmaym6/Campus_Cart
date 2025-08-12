import React, { useState } from "react";
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
        e.preventDefault(); // Prevent default form submission behavior
        setError(""); // Clear any previous errors
        setLoading(true); // Set loading state to true

        try {
            // Send a POST request to the login endpoint
            const response = await axios.post('http://localhost:5000/api/auth/login', {
                email: form.email,
                password: form.password
            });

            // Store the token in localStorage for authentication
            localStorage.setItem('token', response.data.token);
            
            // Optionally store user data
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            // Redirect user to the dashboard upon successful login
            navigate('/dashboard');
        } catch (err) {
            // Set error message if login fails
            setError(err.response?.data?.message || "An error occurred during login");
        } finally {
            // Reset loading state
            setLoading(false);
        }
    };

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