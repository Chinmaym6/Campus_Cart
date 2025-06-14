import React,{useContext,useState} from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "../../components/auth/LoginForm";

function login(){
    return(
        <div>
            <LoginForm />
        </div>
    )
}

export default login;