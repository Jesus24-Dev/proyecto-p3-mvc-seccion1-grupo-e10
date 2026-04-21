import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import prisma from './database/prisma.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", async (req, res) => {
    const users = await prisma.users.findMany();
    res.json("API works correctly!");
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})