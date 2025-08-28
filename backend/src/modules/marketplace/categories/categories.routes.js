import { Router } from "express";
import * as C from "./categories.controller.js";

const router = Router();
router.get("/", C.listCategories);
export default router;
