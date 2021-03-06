const express = require('express');
const router = express.Router();
const pool = require('../../db');
const bcrypt = require('bcrypt');
const jwtGenerator = require('../../utils/jwtGenerator');
const validation = require('../../middleware/validation');
const authorize = require('../../middleware/authorize');

//@route   POST api/auth/register
//@desc    Register
//@access  public
router.post('/register', validation, async (req, res) => {
  try {
    // 1. destructure the req.body (name, email, password)
    const { name, email, password } = req.body;

    // 2. check if user exist (if user exist then throw error)
    const user = await pool.query('SELECT * FROM users WHERE user_email = $1', [
      email
    ]);
    if (user.rows.length !== 0) {
      return res.status(401).json('User already exist');
    }

    // 3. Bcrypt the user password
    const saltRound = 10;
    const salt = await bcrypt.genSalt(saltRound);
    const bcryptPassword = await bcrypt.hash(password, salt);

    // 4. enter the new user inside our database
    const newUser = await pool.query(
      'INSERT INTO users (user_name, user_email, user_password) VALUES ($1, $2, $3) RETURNING *',
      [name, email, bcryptPassword]
    );

    // 5. generating our token
    const token = jwtGenerator(newUser.rows[0].user_id);
    res.json({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//@route   POST api/auth/login
//@desc    Login
//@access  public
router.post('/login', validation, async (req, res) => {
  try {
    // 1. destructure the req.body
    const { email, password } = req.body;

    // 2. check if user exist (if not exist then we throw error)
    const user = await pool.query('SELECT * FROM users WHERE user_email = $1', [
      email
    ]);
    if (user.rows.length === 0) {
      // if not exist then we throw error
      return res.status(401).json('Email or password is incorrect');
    }

    // 3. check if incoming password is the same as the database password
    const validPassword = await bcrypt.compare(
      password,
      user.rows[0].user_password
    ); // true/false

    if (!validPassword) {
      return res.status(401).json('Email or password is incorrect');
    }

    // 4. give them the jwt token
    const token = jwtGenerator(user.rows[0].user_id);
    res.json({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//@route   GET api/auth/login
//@desc    If token valid from authorize, then return true
//@access  private
router.get('/verify', authorize, async (req, res) => {
  try {
    res.json(true);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
