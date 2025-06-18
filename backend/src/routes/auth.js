import bcrypt from 'bcrypt';
import express, { json } from 'express';
import db from '../config/database.js'; 

const pool = db.pool; 
const route = express.Router();
route.use(express.json())


route.post('/register',async (req,res)=>{
    const {first_name,last_name, phone, student_id, email, password}=req.body;

    if(!first_name||!last_name||!phone||!student_id||!email||!password){
        return res.status(400).json({error:"All fields are Required"})
    }

    try{
        const existing = await pool.query("SELECT * FROM users WHERE email=$1",[email]);
        if(existing.rows.length>0){
            res.status(400).json({error : "Email already exits"})
        }

        const hashed_password = await bcrypt.hash(password, 10);

        await pool.query("INSERT INTO users (first_name,last_name, phone, student_id, email, password_hash) VALUES ($1,$2,$3,$4,$5,$6)",
            [first_name,last_name, phone, student_id, email, hashed_password])

            return res.status(201).json({ message: "User registered successfully" });
    }

    catch(err){
        console.error("Registration error:", err.message);
    res.status(500).json({ error: "Server error" });
    }
});

export default route;