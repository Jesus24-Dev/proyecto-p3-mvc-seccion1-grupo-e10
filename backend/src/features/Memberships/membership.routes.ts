import { Router } from "express";
import { MembershipController } from "./membership.controller.js";
import { MembershipService } from "./membership.service.js";
import { MembershipRepository } from "./membership.repository.js";
import {
  CreateMembershipSchema,
  UpdateMembershipSchema,
} from "./membership.schema.js";
import { validate } from "../../shared/validate.js";
import { requireAdmin } from "../Auth/auth.middleware.js";

const router = Router();

const repository = new MembershipRepository();
const service = new MembershipService(repository);
const controller = new MembershipController(service);

router.use(requireAdmin);
router.get('/', controller.getMemberships);
router.post('/', validate(CreateMembershipSchema), controller.createMembership);
router.put('/:id', validate(UpdateMembershipSchema), controller.updateMembership);
router.delete('/:id', controller.deleteMembership);

export const MembershipRoutes = router;
