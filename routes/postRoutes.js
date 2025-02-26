const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Post = require('../model/postSchema');
const User = require('../model/userSchema');
const authenticateJWT = require('../middleware/authJWT');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               media:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Post created successfully
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Error creating post
 */
router.post('/', authenticateJWT, upload.single('media'), async (req, res) => {
  const { content } = req.body;
  const userId = req.user.id;

  let mediaUrl = null;
  if (req.file) {
    try {
      const uploadStream = cloudinary.uploader.upload_stream({ resource_type: 'auto' }, async (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return res.status(500).json({ message: 'Upload failed', error });
        }

        const newPost = new Post({ userId, content, media: result.secure_url });
        await newPost.save();
        res.status(201).json({ message: 'Post created successfully', post: newPost });
      });

      const stream = require('stream');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(req.file.buffer);
      bufferStream.pipe(uploadStream);
    } catch (error) {
      console.error('Error in post creation route:', error);
      res.status(500).json({ message: 'Error creating post', error });
    }
  } else {
    const newPost = new Post({ userId, content });
    await newPost.save();
    res.status(201).json({ message: 'Post created successfully', post: newPost });
  }
});

// Get all posts
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().populate('userId', 'username profilePicture');
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching posts', error });
  }
});

// Get a single post by ID
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('userId', 'username profilePicture');
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching post', error });
  }
});

// Update a post
router.put('/:id', authenticateJWT, upload.single('media'), async (req, res) => {
  const { content } = req.body;
  let mediaUrl = null;

  try {
    if (req.file) {
      const result = await cloudinary.uploader.upload_stream(req.file.buffer, { resource_type: 'auto' });
      result.on('finish', async () => {
        mediaUrl = result.secure_url;
        const updatedPost = await Post.findByIdAndUpdate(req.params.id, { content, media: mediaUrl }, { new: true });
        if (!updatedPost) {
          return res.status(404).json({ message: 'Post not found' });
        }
        res.status(200).json({ message: 'Post updated successfully', post: updatedPost });
      });

      result.on('error', (error) => {
        return res.status(500).json({ message: 'Upload failed', error });
      });

      req.file.stream.pipe(result);
    } else {
      const updatedPost = await Post.findByIdAndUpdate(req.params.id, { content }, { new: true });
      if (!updatedPost) {
        return res.status(404).json({ message: 'Post not found' });
      }
      res.status(200).json({ message: 'Post updated successfully', post: updatedPost });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating post', error });
  }
});

// Delete a post
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id);
    if (!deletedPost) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting post', error });
  }
});

module.exports = router; 