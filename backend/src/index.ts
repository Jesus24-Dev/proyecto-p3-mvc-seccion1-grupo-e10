import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import {UserRoutes} from "./features/Users/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use('/users', UserRoutes);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})