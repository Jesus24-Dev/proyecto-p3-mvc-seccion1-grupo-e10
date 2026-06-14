import { Router } from "express";
import { UserInformationController } from "./userInformation.controller.js";
import { UserInformationService } from "./userInformation.service.js";
import { UserInformationRepository } from "./userInformation.repository.js";
import { CreateUserInformationSchema } from "./userInformation.schema.js";
import { validate } from "../../shared/validate.js";
import { requireAuth } from "../Auth/auth.middleware.js";

const router = Router();

const repository = new UserInformationRepository();
const service = new UserInformationService(repository);
const controller = new UserInformationController(service);

router.use(requireAuth);
// TODO implementar requireRoles en las demas rutas

router.get('/', controller.getUsersInformation);
router.get('/:user_id', controller.getUserInformationByUserId);
router.post('/', validate(CreateUserInformationSchema), controller.createUserInformation);
router.put('/:user_id', controller.updateUserInformationUsingUserId);
router.delete('/:user_id', controller.deleteUserInformationUsingUserId);

//TODO
//Implements controllers using its ID 

export const UserInformationRoutes = router;