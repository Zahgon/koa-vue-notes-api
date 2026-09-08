import express from "express";
import { jwt } from "../middleware/jwt";
import { asyncHandler } from "../middleware/async-handler";

import {
  signup,
  authenticate,
  refreshAccessToken,
  invalidateAllRefreshTokens,
  invalidateRefreshToken,
  forgot,
  checkPasswordResetToken,
  reset,
  privateArea,
} from "../controllers/user-action-controller";

export const router = express.Router();
const jwtMiddleware = jwt({ secret: process.env.JWT_SECRET });

const baseUrl = "/api/v1";

router.post(`${baseUrl}/user/signup`, asyncHandler(signup));
router.post(`${baseUrl}/user/authenticate`, asyncHandler(authenticate));
router.post(
  `${baseUrl}/user/refreshAccessToken`,
  asyncHandler(refreshAccessToken),
);
router.post(
  `${baseUrl}/user/invalidateAllRefreshTokens`,
  jwtMiddleware,
  asyncHandler(invalidateAllRefreshTokens),
);
router.post(
  `${baseUrl}/user/invalidateRefreshToken`,
  jwtMiddleware,
  asyncHandler(invalidateRefreshToken),
);
router.post(`${baseUrl}/user/forgot`, asyncHandler(forgot));
router.post(
  `${baseUrl}/user/checkPasswordResetToken`,
  asyncHandler(checkPasswordResetToken),
);
router.post(`${baseUrl}/user/reset`, asyncHandler(reset));
router.post(
  `${baseUrl}/user/private`,
  jwtMiddleware,
  asyncHandler(privateArea),
);
