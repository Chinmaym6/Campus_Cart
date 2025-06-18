import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./src/config/database.js";  // 👈 default object impor
import route from "./src/routes/auth.js";

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:3000',credentials: true  }));
app.use(express.json());

app.use('/auth', route);

// 👇 Destructure the function from the object
const { connectToDatabase } = db;

app.listen(port, async () => {
    await connectToDatabase();  // ✅ Now this works!
    console.log(`Server is running at http://localhost:${port}/`);
});
