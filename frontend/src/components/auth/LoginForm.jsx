import React,{useContext,useState} from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

function LoginForm(){
    const [form,setform]=useState({email:"",password:""})

        const handlesubmit= async (e)=>{
    }

    return(
        <div>
            <div className="LoginForm">
                <form onSubmit={handlesubmit}>
                    <input type="email" placeholder="Enter Email" value={form.email} onChange={(e)=>setform({...form,email:e.target.value}) }/>
                    <input type="password" placeholder="Enter password" value={form.password} onChange={(e)=>setform({...form,password:e.target.value})} />
                    <button type="submit">Login</button>
                </form>
                <Link to="/register" >Click here to Register</Link>
            </div>
        </div>
    )
}

export default LoginForm;