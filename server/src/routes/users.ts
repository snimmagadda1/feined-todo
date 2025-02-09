import { Router } from "express";
import { type User, type UserRequest } from "../models";
import logger from "../utils/logger";
import { userService } from "../services";
import { isAuth } from "../middleware/session";

const router = Router();

/**
 * @openapi
 * /user:
 *   post:
 *     tags:
 *       - Users
 *     summary: Create a new user
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRequest'
 *     responses:
 *       200:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post("/", isAuth, (req, res) => {
  try {
    /*
    const isValid = validators.user(req.body);
    if (!isValud) {
    return res.status(400).json({ error: "bad request" });
    
    const user = doINSERT HERE

    */
    const userRequest: UserRequest = req.body;

    // todo: validate user
    const user = userService.createUser(userRequest);

    res.status(200).json(user);
  } catch (error) {
    logger.error("Error during create user", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * /user/{userId}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by ID
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to retrieve
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get("/:userId", isAuth, (req, res) => {
  try {
    const { userId } = req.params;
    const user = userService.getUser(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.status(200).json(user);
  } catch (error) {
    logger.error("Error during get user", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * components:
 *   schemas:
 *     UserRequest:
 *       type: object
 *       required:
 *         - email
 *         - name
 *         - githubId
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         name:
 *           type: string
 *         githubId:
 *           type: string
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         name:
 *           type: string
 *         githubId:
 *           type: string
 *         _deleted:
 *           type: boolean
 */
export default router;
