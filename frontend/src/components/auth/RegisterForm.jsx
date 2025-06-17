import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function RegisterForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fname: "",
    lname: "",
    phnumber: "",
    student_id: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: call your register API, then…
    // on success:
    // navigate("/login");
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="First name"
          value={form.fname}
          onChange={(e) => setForm({ ...form, fname: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Last name"
          value={form.lname}
          onChange={(e) => setForm({ ...form, lname: e.target.value })}
          required
        />
        <input
          type="tel"
          placeholder="Enter Ph. number"
          value={form.phnumber}
          onChange={(e) => setForm({ ...form, phnumber: e.target.value })}
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
