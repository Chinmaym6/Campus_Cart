import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import connectToDatabase from "./src/config/database.js";


dotenv.config();
const app=express();
const port=process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:3000'}));
app.use(express.json());


connectToDatabase();


app.listen(port,()=>{
    console.log('Server is running at http://localhost:5000/')
});