import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import "./RegisterForm.css";

export default function RegisterForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    student_id: "",
    email: "",
    password: "",
    graduation_year: new Date().getFullYear(),
    bio: "",
    location_address: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post('/auth/register', form);
      console.log("Registration success", response.data);
      navigate("/login");
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      setError(error.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="register-form">
        <h2>Create Account</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name">First Name</label>
              <input
                id="first_name"
                type="text"
                placeholder="Enter first name"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="last_name">Last Name</label>
              <input
                id="last_name"
                type="text"
                placeholder="Enter last name"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Enter university email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              type="tel"
              placeholder="Enter phone number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="student_id">Student ID</label>
              <input
                id="student_id"
                type="text"
                placeholder="Enter student ID"
                value={form.student_id}
                onChange={(e) => setForm({ ...form, student_id: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label htmlFor="graduation_year">Graduation Year</label>
              <input
                id="graduation_year"
                type="number"
                min={new Date().getFullYear()}
                max={new Date().getFullYear() + 6}
                value={form.graduation_year}
                onChange={(e) => setForm({ ...form, graduation_year: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Create password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="location">Address</label>
            <input
              id="location"
              type="text"
              placeholder="Enter your address"
              value={form.location_address}
              onChange={(e) => setForm({ ...form, location_address: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              placeholder="Tell us about yourself"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows="3"
            />
          </div>

          <button 
            type="submit" 
            className="submit-btn" 
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Register"}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login">Already have an account? Sign in</Link>
        </div>
      </div>
    </div>
  );
}
