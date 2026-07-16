import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { AuthRoutes } from "./features/Auth/index.js";
import { UserRoutes } from "./features/Users";
import { UserInformationRoutes } from "./features/UsersInformation";
import { AgencyRoutes } from "./features/Agencies";
import { OrderRoutes } from "./features/Orders";
import { PackageRoutes } from "./features/Packages";
import { MembershipRoutes } from "./features/Memberships";
import { AutomationHookRoutes, AutomationRoutes } from "./features/Automations";
import { TrackingRoutes } from "./features/Tracking";
import { TagRoutes } from "./features/Tags";
import { EmailTemplateRoutes } from "./features/EmailTemplates";
import { EmailDomainRoutes } from "./features/EmailDomains";
import { AiRoutes } from "./features/AI";
import { PaymentRoutes } from "./features/Payments";
import { AuditRoutes } from "./features/Audit";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.get("/", (_req, res) => {
  return res.status(200).json({ status: "ok" });
});
app.use("/auth", AuthRoutes);
app.use("/users", UserRoutes);
app.use("/info", UserInformationRoutes);
app.use("/agencies", AgencyRoutes);
app.use("/orders", OrderRoutes);
app.use("/packages", PackageRoutes);
app.use("/memberships", MembershipRoutes);
app.use("/automations", AutomationRoutes);
app.use("/hooks", AutomationHookRoutes);
app.use("/tracking", TrackingRoutes);
app.use("/tags", TagRoutes);
app.use("/email-templates", EmailTemplateRoutes);
app.use("/email-domains", EmailDomainRoutes);
app.use("/ai", AiRoutes);
app.use("/payments", PaymentRoutes);
app.use("/audit", AuditRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
