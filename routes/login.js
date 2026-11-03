import express from 'express';
import control from '../controllers/control.js';
import passport from 'passport';
import User from '../model/accountdb.js';

const router = express.Router();

//bases register, login, logout function. I didn't create a seprate controller for this

/**
 * @swagger
 * /login/newuser:
 *   post:
 *     summary: Registers a new user
 *     tags:
 *       - Account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/account'
 *     responses:
 *       200:
 *         description: OK
 */
router.post("/newuser", async (req, res) => {
  // Extract the username and password from the request body.
 
  const { username, password, cpassword } = req.body;
  try {
    // The 'hashPassword' method is assumed to be a static method on the User model.
    if(password!=cpassword)res.status(402).json({ message: "Password does not match", error: error.message });
    const hashedpassword = await User.hashing(password);
    // Create a new user instance with the username and the hashed password.
    const newUser = new User({ username, password: hashedpassword });
    // Save the new user to the database.
    await newUser.save();
    // If user creation is successful, send a 201 (Created) status and a success message.
    res.status(201).json({ message: "User created" });
  } catch (error) {
    // If there's an error (e.g., username already exists, database error), send a 400 (Bad Request) status and an error message.
    res.status(400).json({ message: "User create fail", error: error.message });
  }
});

/**
 * @swagger
 * /login/user:
 *   post:
 *     summary: Logs in a user
 *     tags:
 *       - Account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/newaccount'
 *     responses:
 *       200:
 *         description: OK
 */
router.post("/user", passport.authenticate("local"), (req, res) => {
  
  res.json({
    message: "Login successful",
    user: { username: req.user.username }
  });
});


/**
 * @swagger
 * /login/nouser:
 *   get:
 *     summary: Logs out the user of the current sesion
 *     tags:
 *       - Account
 *     responses:
 *       200:
 *         description: OK
 */

// Define a GET route for user logout at '/logout'.
router.get("/nouser", (req, res) => {
  
  req.logout((err) => {
    // The callback function for `req.logout()` receives an error object if something goes wrong.
    if (err) {
      // If there's an error during logout, send a 500 (Internal Server Error) status and an error message.
      return res
        .status(500)
        .json({ message: "Logout failed", error: err.message });
    }
    // If logout is successful, redirect the user to the homepage (or any other appropriate page).
    res.redirect("/login.html"); // Assuming index.html is your public homepage
  });
});

export default router;