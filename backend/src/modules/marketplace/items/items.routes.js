import { Router } from "express";
import { requireAuth } from "../../../middleware/auth.js";
import upload from "../../../middleware/upload.js";
import * as controller from "./items.controller.js";

const r = Router();

// LISTS (dashboard + marketplace)
r.get("/", requireAuth, controller.list);
r.get("/saved", requireAuth, controller.listSaved); 
r.get("/mine", requireAuth, controller.listMine);  

// CRUD
r.post("/", requireAuth, upload.array("photos", 8), controller.create);
r.get("/:id", requireAuth, controller.getById);
r.patch("/:id", requireAuth, controller.update);
r.delete("/:id", requireAuth, controller.remove);

// Wishlist
r.post("/:id/save", requireAuth, controller.save);
r.delete("/:id/save", requireAuth, controller.unsave);

export default r;
