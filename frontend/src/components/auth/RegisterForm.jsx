import { useState, useEffect } from "react";
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
  

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Axios is already configured in api.js
  
  // Fetch universities on component mount


  const validateField = (name, value) => {
    const currentYear = new Date().getFullYear();
    const fieldErrors = {};

    switch (name) {
      case "first_name":
        if (!value) fieldErrors[name] = "First name is required";
        else if (value.length < 2) fieldErrors[name] = "First name must be at least 2 characters";
        break;
      case "last_name":
        if (!value) fieldErrors[name] = "Last name is required";
        else if (value.length < 2) fieldErrors[name] = "Last name must be at least 2 characters";
        break;
      case "email":
        if (!value) fieldErrors[name] = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fieldErrors[name] = "Please enter a valid email address";
        break;
      case "password":
        if (!value) fieldErrors[name] = "Password is required";
        else if (value.length < 8) fieldErrors[name] = "Password must be at least 8 characters";
        else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(value))
          fieldErrors[name] = "Password must contain uppercase, lowercase, number, and special character";
        break;
      case "phone":
        if (!value) fieldErrors[name] = "Phone number is required";
        else if (!/^\+?[1-9]\d{1,14}$/.test(value.replace(/[\s()-]/g, '')))
          fieldErrors[name] = "Please enter a valid phone number";
        break;
      case "student_id":
        if (!value) fieldErrors[name] = "Student ID is required";
        break;
      case "graduation_year":
        if (!value) fieldErrors[name] = "Graduation year is required";
        else if (value < currentYear || value > currentYear + 6)
          fieldErrors[name] = `Graduation year must be between ${currentYear} and ${currentYear + 6}`;
        break;

      default:
        break;
    }

    return fieldErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    // Clear previous errors for this field
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }

    // Validate the field in real-time
    const fieldErrors = validateField(name, value);
    setErrors({ ...errors, ...fieldErrors });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    console.log('Form data being submitted:', form);

    // Validate all required fields
    const newErrors = {};
    const requiredFields = ['first_name', 'last_name', 'email', 'password', 'phone', 'student_id', 'graduation_year'];
    
    requiredFields.forEach((field) => {
      const fieldErrors = validateField(field, form[field]);
      Object.assign(newErrors, fieldErrors);
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/api/auth/register", form);
      setMessage(response.data.message);
      setTimeout(() => navigate("/login"), 5000);
    } catch (err) {
      setErrors({ form: err.response?.data?.message || "Registration failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="brand">Campus Cart</h1>
            <p className="tagline">Join the campus community</p>
          </div>

          <div className="auth-content">
            <h2>Create Account</h2>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    name="first_name"
                    type="text"
                    placeholder="Enter first name"
                    value={form.first_name}
                    onChange={handleChange}
                    className={errors.first_name ? "error" : ""}
                  />
                  {errors.first_name && <span className="error-text">{errors.first_name}</span>}
                </div>

                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    name="last_name"
                    type="text"
                    placeholder="Enter last name"
                    value={form.last_name}
                    onChange={handleChange}
                    className={errors.last_name ? "error" : ""}
                  />
                  {errors.last_name && <span className="error-text">{errors.last_name}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <input
                  name="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={form.email}
                  onChange={handleChange}
                  className={errors.email ? "error" : ""}
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={form.phone}
                    onChange={handleChange}
                    className={errors.phone ? "error" : ""}
                  />
                  {errors.phone && <span className="error-text">{errors.phone}</span>}
                </div>

                <div className="form-group">
                  <label>Student ID *</label>
                  <input
                    name="student_id"
                    type="text"
                    placeholder="Your student ID"
                    value={form.student_id}
                    onChange={handleChange}
                    className={errors.student_id ? "error" : ""}
                  />
                  {errors.student_id && <span className="error-text">{errors.student_id}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Graduation Year *</label>
                  <select
                    name="graduation_year"
                    value={form.graduation_year}
                    onChange={handleChange}
                    className={errors.graduation_year ? "error" : ""}
                  >
                    {[...Array(7)].map((_, i) => {
                      const year = new Date().getFullYear() + i;
                      return <option key={year} value={year}>{year}</option>
                    })}
                  </select>
                  {errors.graduation_year && <span className="error-text">{errors.graduation_year}</span>}
                </div>
                

              </div>

              <div className="form-group">
                <label>Password *</label>
                <input
                  name="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={handleChange}
                  className={errors.password ? "error" : ""}
                />
                {errors.password && <span className="error-text">{errors.password}</span>}
                <small className="help-text">Must contain uppercase, lowercase, number, and special character</small>
              </div>

              <div className="form-group">
                <label>Address</label>
                <input
                  name="location_address"
                  type="text"
                  placeholder="Your address (optional)"
                  value={form.location_address}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea
                  name="bio"
                  placeholder="Tell us about yourself (optional)"
                  value={form.bio}
                  onChange={handleChange}
                  rows="3"
                  maxLength="500"
                />
                <small className="help-text">{form.bio.length}/500 characters</small>
              </div>

              <button 
                type="submit" 
                className="btn primary full-width"
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
            {message && <div className="alert success">{message}</div>}
            {errors.form && <div className="alert error">{errors.form}</div>}

            <div className="auth-footer">
              <p>Already have an account? <Link to="/login">Sign in</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
