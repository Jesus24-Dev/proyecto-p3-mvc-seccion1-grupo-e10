import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import {UserRoutes} from "./features/Users";
import { UserInformationRoutes } from "./features/UsersInformation";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use('/users', UserRoutes);
app.use('/info', UserInformationRoutes);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})