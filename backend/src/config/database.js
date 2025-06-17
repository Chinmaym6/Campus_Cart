import {Pool} from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
    user:process.env.USER,
    host:process.env.HOST,
    database:process.env.DATABASE,
    password:process.env.PASSWORD,
    port:Number(process.env.DB_PORT),
});

const connectToDatabase = async (e)=>{
    try{
        await pool.connect();
        console.log("Database Connected successfully!")
    }
    catch(error){
        console.log("Problem connecting to Database")
        process.exit(1);
    }
};

export default connectToDatabase;