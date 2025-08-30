import { Router } from "express";
import * as controller from "./categories.controller.js";

const r = Router();
r.get("/", controller.list);
export default r;
