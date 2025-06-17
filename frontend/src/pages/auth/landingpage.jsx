import { Navigate, useNavigate } from "react-router-dom";

function Landing(){

    const navigate=useNavigate();

    return(
        <div>
            <div>
                <button onClick={(e)=>{navigate('/login')}}>Login</button>
                <button onClick={(e)=>{navigate('/register')}}>Register</button>
            </div>
        </div>
    )
}

export default Landing;