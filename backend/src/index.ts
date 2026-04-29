import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { AuthRoutes } from "./features/Auth/index.js";
import { UserRoutes } from "./features/Users";
import { UserInformationRoutes } from "./features/UsersInformation";
import { AgencyRoutes } from "./features/Agencies";
import { OrderRoutes } from "./features/Orders";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use("/auth", AuthRoutes);
app.use("/users", UserRoutes);
app.use("/info", UserInformationRoutes);
app.use("/agencies", AgencyRoutes);
app.use("/orders", OrderRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
