import express from "express";
import { jwt } from "../middleware/jwt";
import { asyncHandler } from "../middleware/async-handler";

import {
  index,
  show,
  create,
  update,
  del,
} from "../controllers/note-controller";

export const router = express.Router();
const jwtMiddleware = jwt({ secret: process.env.JWT_SECRET });

const baseUrl = "/api/v1";

router.get(`${baseUrl}/notes`, jwtMiddleware, asyncHandler(index));
router.post(`${baseUrl}/notes`, jwtMiddleware, asyncHandler(create));
router.get(`${baseUrl}/notes/:id`, jwtMiddleware, asyncHandler(show));
router.put(`${baseUrl}/notes/:id`, jwtMiddleware, asyncHandler(update));
router.delete(`${baseUrl}/notes/:id`, jwtMiddleware, asyncHandler(del));
