import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../utils/api";
export default function RegisterForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    student_id: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try{
      const res = await api.post('/auth/register',form)
      console.log("Registration success",res.data)
      navigate("/login")
    }
    catch(error){
      console.error('Registration error:', error.response?.data || error.message);
      alert(error.response?.data?.error || "Registration failed");
    };
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="First name"
          value={form.first_name}
          onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Last name"
          value={form.last_name}
          onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          required
        />
        <input
          type="tel"
          placeholder="Enter Ph. number"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Enter Your student id (USN)...(Optional)"
          value={form.student_id}
          onChange={(e) => setForm({ ...form, student_id: e.target.value })}
        />
        <input
          type="email"
          placeholder="Enter email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Enter Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <button type="submit">Register</button>
      </form>

      <Link to="/login">Already registered? Click here to login</Link>
    </div>
  );
}
