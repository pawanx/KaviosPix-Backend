const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Image = require("../models/Image");
const Album = require("../models/Album");
const fs = require("fs");
const cloudinary = require("../config/cloudinary");
const upload = require("../middleware/uploadMiddleware");

const checkAlbumAccess = (album, user) => {
  return (
    album.ownerId.toString() === user.userId ||
    album.sharedUsers.includes(user.email)
  );
};

// ---------- POST/CREATE IMAGE ---------------------
router.post(
  "/:albumId/images",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      const { albumId } = req.params;

      const { tags, person, isFavorite } = req.body;

      // check if album exists
      const album = await Album.findOne({ albumId });
      if (!album) {
        return res.status(404).json({
          success: false,

          message: "Album not found",
        });
      }

      //Check for access

      if (album.ownerId.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
      //   check for file
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Image file is required",
        });
      }

      //   upload to cloudinary
      const uploadedImage = await cloudinary.uploader.upload(req.file.path, {
        folder: "kaviosPix",
      });

      // Create image in DB
      const image = await Image.create({
        albumId,
        name: req.file.originalname,
        imageUrl: uploadedImage.secure_url,
        cloudinaryId: uploadedImage.public_id,
        tags: tags ? tags.split(",") : [],
        person,
        isFavorite,
        comments: [],
        size: req.file.size,
      });

      // Now delete local file
      fs.unlinkSync(req.file.path);
      res.status(201).json({
        success: true,

        message: "Image uploaded successfully",

        image,
      });
    } catch (error) {
      res.status(500).json({
        success: false,

        message: "Image upload failed",
      });
      console.log("Server Error while uploading: ", error);
    }
  },
);

/*
========================================
GET ALL IMAGES
========================================
*/

router.get(
  "/:albumId/images",

  authMiddleware,

  async (req, res) => {
    try {
      const { albumId } = req.params;

      /*
      ========================================
      Find Album
      ========================================
      */

      const album = await Album.findOne({ albumId });

      if (!album) {
        return res.status(404).json({
          success: false,
          message: "Album not found",
        });
      }

      /*
      ========================================
      Permission Check
      ========================================
      */

      const hasAccess = checkAlbumAccess(album, req.user);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      /*
      ========================================
      Fetch Images
      ========================================
      */

      const images = await Image.find({ albumId });

      res.status(200).json({
        success: true,

        images,
      });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch images",
      });
    }
  },
);

/*
========================================
GET SINGLE IMAGE
========================================
*/

router.get(
  "/:albumId/images/:imageId",

  authMiddleware,

  async (req, res) => {
    try {
      const { albumId, imageId } = req.params;

      const album = await Album.findOne({ albumId });

      if (!album) {
        return res.status(404).json({
          success: false,
          message: "Album not found",
        });
      }

      const hasAccess = checkAlbumAccess(album, req.user);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const image = await Image.findOne({
        imageId,
      });

      if (!image) {
        return res.status(404).json({
          success: false,
          message: "Image not found",
        });
      }

      res.status(200).json({
        success: true,

        image,
      });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch image",
      });
    }
  },
);

// ---------- ADD TAGS ---------------------------
router.put(
  "/:albumId/images/:imageId/tags",
  authMiddleware,
  async (req, res) => {
    try {
      const { imageId, albumId } = req.params;
      const { tags } = req.body;

      if (!tags || !Array.isArray(tags)) {
        return res.status(400).json({
          success: false,
          message: "Tags array is required",
        });
      }

      const image = await Image.findOne({ imageId });
      if (!image) {
        return res.status(404).json({
          success: false,
          message: "Image not found.",
        });
      }

      // check if album exists
      const album = await Album.findOne({ albumId });
      if (!album) {
        return res.status(404).json({
          success: false,

          message: "Album not found",
        });
      }
      //Check for access
      const hasAccess = checkAlbumAccess(album, req.user);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
      image.tags.push(...tags);
      await image.save();

      res.status(200).json({
        success: true,
        message: "Tags added successfully",
        tags: image.tags,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Failed to add tags",
      });
    }
  },
);

// ---------- ADD COMMENT ------------------------
router.put(
  "/:albumId/images/:imageId/comments",
  authMiddleware,
  async (req, res) => {
    try {
      const { imageId, albumId } = req.params;
      const { comment } = req.body;

      if (!comment) {
        return res.status(400).json({
          success: false,

          message: "Comment is required",
        });
      }

      const image = await Image.findOne({ imageId });

      if (!image) {
        return res.status(404).json({
          success: false,

          message: "Image not found",
        });
      }

      // check if album exists
      const album = await Album.findOne({ albumId });
      if (!album) {
        return res.status(404).json({
          success: false,

          message: "Album not found",
        });
      }
      //Check for access
      const hasAccess = checkAlbumAccess(album, req.user);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
      image.comments.push(comment);

      await image.save();
      res.status(200).json({
        success: true,
        message: "Comment added successfully",
        comments: image.comments,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Failed to add comment",
      });
    }
  },
);

// ----------- fAVORITE Unfavorite image
router.put(
  "/:albumId/images/:imageId/favorite",
  authMiddleware,
  async (req, res) => {
    try {
      const { imageId, albumId } = req.params;
      const { isFavorite } = req.body;

      const image = await Image.findOne({ imageId });
      if (!image) {
        return res.status(404).json({
          success: false,
          message: "Image not found.",
        });
      }
      // check if album exists
      const album = await Album.findOne({ albumId });
      if (!album) {
        return res.status(404).json({
          success: false,

          message: "Album not found",
        });
      }
      //Check for access

      if (album.ownerId.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
      image.isFavorite = isFavorite;
      await image.save();

      res.status(200).json({
        success: true,

        message: "Favorite status updated",

        isFavorite: image.isFavorite,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Failed to update favorite status",
      });
    }
  },
);

// ------------- DELETE IMAGE -----------------
router.delete("/:albumId/images/:imageId", authMiddleware, async (req, res) => {
  try {
    const { albumId, imageId } = req.params;
    const image = await Image.findOne({ imageId });

    if (!image) {
      return res.status(404).json({
        success: false,

        message: "Image not found",
      });
    }
    // check if album exists
    const album = await Album.findOne({ albumId });
    if (!album) {
      return res.status(404).json({
        success: false,

        message: "Album not found",
      });
    }
    //Check for access

    if (album.ownerId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Only owner can delete image",
      });
    }
    await cloudinary.uploader.destroy(image.cloudinaryId);

    await Image.findOneAndDelete({ imageId });

    res.status(200).json({
      success: true,

      message: "Image deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete image",
    });
  }
});

module.exports = router;
