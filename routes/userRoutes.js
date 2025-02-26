const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../model/userSchema');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const authenticateJWT = require('../middleware/authJWT');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


router.post('/register', upload.single('profilePicture'), async (req, res) => {
  const { username, password } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: 'Profile picture is required' });
  }

  try {
    const uploadStream = cloudinary.uploader.upload_stream({ resource_type: 'auto' }, async (error, result) => {
      if (error) {
        return res.status(500).json({ message: 'Upload failed', error });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({ username, password: hashedPassword, profilePicture: result.secure_url });
      
      await newUser.save();
      res.status(201).json({ message: 'User created successfully', profilePicture: result.secure_url });
    });

    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);
    bufferStream.pipe(uploadStream);
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error });
  }
});

// Login user
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  
  if (user && (await bcrypt.compare(password, user.password))) {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password')-;
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error });
  }
});

// Get a single user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' }).select('-password');
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error });
  }
});

// Update a user
router.put('/:id', authenticateJWT, upload.single('profilePicture'), async (req, res) => {
  const { username, password } = req.body;
  let updateData = {};

  if (username) {
    updateData.username = username;
  }

  if (password) {
    updateData.password = await bcrypt.hash(password, 10);
  }

  if (req.file) {
    try {
      const result = await cloudinary.uploader.upload_stream(req.file.buffer, { resource_type: 'auto' });
      const uploadPromise = new Promise((resolve, reject) => {
        result.on('finish', resolve);
        result.on('error', reject);
        req.file.stream.pipe(result);
      });

      await uploadPromise;
      updateData.profilePicture = result.secure_url;

      const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json({ message: 'User updated successfully', user: updatedUser });
    } catch (error) {
      return res.status(500).json({ message: 'Error uploading profile picture', error });
    }
  } else {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User updated successfully', user: updatedUser });
  }
});

// Delete a user
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error });
  }
});

module.exports = router; 
