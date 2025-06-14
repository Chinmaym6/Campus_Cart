import React,{useContext,useState} from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import axios from axios;

function LoginForm(){
    const [form,setform]=useState({email:"",password:""})

    const handlesubmit=async (e)=>{
        const res = await axios.post("/login",form)
    }

    return(
        <div>
            <div className="LoginForm">
                <form onSubmit={handlesubmit}>
                    <input type="email" placeholder="Enter Email" value={form.email} onChange={(e)=>setform({...form,email:e.target.value}) }/>
                    <input type="password" placeholder="Enter password" value={form.password} onChange={(e)=>setform({...form,password:e.target.value})} />
                    <button type="submit">Login</button>
                </form>
            </div>
        </div>
    )
}

export default LoginForm;