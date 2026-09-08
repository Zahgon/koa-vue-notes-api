import express from "express";
import { format, parseISO } from "date-fns";
import db from "../db/db";
import { asyncHandler } from "../middleware/async-handler";

export const router = express.Router();

const baseUrl = "/api/v1";

router.get("/", (req, res) => {
  res.json({
    data: { message: "Hi there.", version: process.env.IMAGE_TAG },
  });
});

router.get(`${baseUrl}/`, (req, res) => {
  res.json({
    data: { message: "Hi there.", version: process.env.IMAGE_TAG },
  });
});

router.get(`${baseUrl}/datetime`, (req, res) => {
  res.json({
    data: { datetime: parseISO(format(new Date(), "yyyy-MM-dd HH:mm:ss")) },
  });
});

router.get(`${baseUrl}/health`, (req, res) => {
  res.json({
    data: { version: process.env.IMAGE_TAG },
  });
});

router.get(
  `${baseUrl}/healthd`,
  asyncHandler(async (req, res) => {
    try {
      const [result] = await db.raw("SELECT NOW() as currentTime");

      res.json({
        data: {
          message: "SUCCESS",
          datetime: result[0].currentTime,
          version: process.env.IMAGE_TAG,
        },
      });
    } catch (error) {
      throw new Error("ERROR");
    }
  }),
);

router.get(`${baseUrl}/panic`, () => {
  throw new Error("panic");
});
