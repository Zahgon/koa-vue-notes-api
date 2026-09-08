import Joi from "@hapi/joi";
import createError from "http-errors";
import { format, parseISO } from "date-fns";
import { logger } from "../logs/log";

import { User } from "../models/User";
import { Note } from "../models/Note";

const noteSchema = Joi.object({
  id: Joi.number().integer(),
  userId: Joi.number().integer().required(),
  title: Joi.string().required(),
  content: Joi.string().required(),
  ipAddress: Joi.string(),
  updatedAt: Joi.date().optional(),
  createdAt: Joi.date().optional()
});

export const index = async (req, res) => {
  const { query } = req;

  // Attach logged in user
  const user = new User(res.locals.user);
  query.userId = user.id;

  // Init a new note object
  const note = new Note();

  // Let's check that the sort options were set. Sort can be empty
  if (!query.order || !query.page || !query.limit) {
    throw createError(400, "INVALID_ROUTE_OPTIONS");
  }

  // Get paginated list of notes
  try {
    const result = await note.all(query);
    res.json({ data: { notes: result } });
  } catch (error) {
    logger.error(error);
    throw createError(400, { error: { code: 400, message: "INVALID_DATA" } });
  }
};

export const show = async (req, res) => {
  const { params } = req;
  if (!params.id)
    throw createError(400, { error: { code: 400, message: "INVALID_DATA" } });

  // Initialize note
  const note = new Note();

  try {
    // Find and show note
    await note.find(params.id);
    res.json({ data: { note } });
  } catch (error) {
    logger.error(error);
    throw createError(400, { error: { code: 400, message: "INVALID_DATA" } });
  }
};

export const create = async (req, res) => {
  const request = req.body;

  // Attach logged in user
  const user = new User(res.locals.user);
  request.userId = user.id;

  // Add ip
  request.ipAddress = req.ip;

  // Create a new note object using the request params
  const note = new Note(request);

  // Validate the newly created note
  const validator = noteSchema.validate(note);
  if (validator.error) throw createError(400, validator.error.details[0].message);

  try {
    const [resultId] = await note.store();
    note.id = resultId;
    res.json({ data: { note } });
  } catch (error) {
    logger.error(error);
    throw createError(400, { error: { code: 400, message: "INVALID_DATA" } });
  }
};

export const update = async (req, res) => {
  const { params } = req;
  const request = req.body;

  // Make sure they've specified a note
  if (!params.id)
    throw createError(400, { error: { code: 400, message: "INVALID_DATA" } });

  // Find and set that note
  const note = new Note();
  await note.find(params.id);
  if (!note)
    throw createError(400, { error: { code: 400, message: "INVALID_DATA" } });

  // Grab the user, if it's not their note - error out
  const user = new User(res.locals.user);
  if (note.userId !== user.id)
    throw createError(400, { error: { code: 400, message: "INVALID_DATA" } });

  // Add the updated date value
  request.updatedAt = parseISO(format(new Date(), "yyyy-MM-dd HH:mm:ss"));

  // Add the ip
  request.ipAddress = req.ip;

  // Replace the note data with the new updated note data
  Object.keys(req.body).forEach((parameter) => {
    note[parameter] = request[parameter];
  });

  try {
    await note.save();
    res.json({ data: { note } });
  } catch (error) {
    logger.error(error);
    throw createError(400, { error: { code: 400, message: "INVALID_DATA" } });
  }
};

export const del = async (req, res) => {
  const { params } = req;
  if (!params.id)
    throw createError(400, { error: { code: 400, message: "INVALID_DATA" } });

  // Find that note
  const note = new Note();
  await note.find(params.id);
  if (!note)
    throw createError(400, { error: { code: 400, message: "INVALID_DATA" } });

  // Grab the user //If it's not their note - error out
  const user = new User(res.locals.user);
  if (note.userId !== user.id)
    throw createError(400, { error: { code: 400, message: "INVALID_DATA" } });

  try {
    await note.destroy();
    res.json({ data: {} });
  } catch (error) {
    logger.error(error);
    throw createError(400, { error: { code: 400, message: "INVALID_DATA" } });
  }
};
