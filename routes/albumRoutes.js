const express = require("express");
const router = express.Router();
const Album = require("../models/Album");
const User = require("../models/User");
const Image = require("../models/Image");
const cloudinary = require("../config/cloudinary");
const authMiddleware = require("../middleware/authMiddleware");

// ------------- CREATE ALBUM--------------
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;

    // validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Album name is mandatory",
      });
    }

    const album = await Album.create({
      name,
      description,
      ownerId: req.user.userId,
    });

    res.status(201).json({
      success: true,
      message: "New Album successfully created.",
      album,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
    console.log("Server error in creating album: ", error);
  }
});

/*
========================================
SHARE ALBUM
========================================
*/

router.post(
  "/:albumId/share",

  authMiddleware,

  async (req, res) => {
    try {
      const { albumId } = req.params;

      const { emails } = req.body;

      /*
      ========================================
      Validate Emails Array
      ========================================
      */

      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({
          success: false,

          message: "Emails array is required",
        });
      }

      /*
      ========================================
      Find Album
      ========================================
      */

      const album = await Album.findOne({
        albumId,
      });

      if (!album) {
        return res.status(404).json({
          success: false,

          message: "Album not found",
        });
      }

      /*
      ========================================
      Owner Check
      ========================================
      */

      if (album.ownerId !== req.user.userId) {
        return res.status(403).json({
          success: false,

          message: "Only owner can share album",
        });
      }

      /*
      ========================================
      Validate All Users Exist
      ========================================
      */

      const users = await User.find({
        email: { $in: emails },
      });

      /*
      ========================================
      Missing Users
      ========================================
      */

      const foundEmails = users.map((user) => user.email);

      const missingEmails = emails.filter(
        (email) => !foundEmails.includes(email),
      );

      if (missingEmails.length > 0) {
        return res.status(404).json({
          success: false,

          message: "Some users not found",

          missingEmails,
        });
      }

      /*
      ========================================
      Remove Duplicates
      ========================================
      */

      album.sharedUsers = [...new Set([...album.sharedUsers, ...emails])];

      await album.save();

      res.status(200).json({
        success: true,

        message: "Album shared successfully",

        sharedUsers: album.sharedUsers,
      });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        success: false,

        message: "Failed to share album",
      });
    }
  },
);

// ---------- GET ALL ALBUMS -----------------
router.get("/", authMiddleware, async (req, res) => {
  try {
    const albums = await Album.find({
  $or: [
    {
      ownerId: req.user.userId,
    },

    {
      sharedUsers: req.user.email,
    },
  ],
});

const albumsWithCounts = await Promise.all(
  albums.map(async (album) => {
    const imageCount = await Image.countDocuments({
      albumId: album.albumId,
    });

    return {
      ...album.toObject(),
      imageCount,
    };
  }),
);

    // if (!albums) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "error in feching albums",
    //   });
    // } it always return array maybe []

    res.status(200).json({
      success: true,
      message: "Albums fetched successfully.",
      totalAlbums: albums.length,
      albums : albumsWithCounts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
    console.log("Server error while fetching albums: ", error);
  }
});

// --------- GET ALBUM BY ID ---------------
router.get("/:albumId", authMiddleware, async (req, res) => {
  try {
    const { albumId } = req.params;
    const album = await Album.findOne({ albumId });

    if (!album) {
      return res.status(404).json({
        success: false,
        message: "Album not found.",
      });
    }
    const isOwner = album.ownerId === req.user.userId;
    const isShared = album.sharedUsers.includes(req.user.email);

    if (!isOwner && !isShared) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.status(200).json({
      success: true,
      message: "Album found successfully",
      album,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
    console.log("Server error in finding album: ", error);
  }
});

// ----------- UPDATE ALBUM ------------------
router.put("/:albumId", authMiddleware, async (req, res) => {
  try {
    const { albumId } = req.params;
    const { name, description } = req.body;

    const album = await Album.findOne({ albumId });

    if (!album) {
      return res.status(404).json({
        success: false,
        message: "Album not found to update",
      });
    }

    if (album.ownerId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized user to do current job.",
      });
    }

    const updatedAlbum = await Album.findOneAndUpdate(
      {
        albumId,
      },
      { name, description },
      { new: true },
    );

    res.status(200).json({
      success: true,
      message: "Album updated successfully.",
      updatedAlbum,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while updating album",
    });
    console.log("Server error in updating album: ", error);
  }
});

// ---------------- DELETE ALBUM -------------------
router.delete("/:albumId", authMiddleware, async (req, res) => {
  try {
    const { albumId } = req.params;

    const album = await Album.findOne({ albumId });
    if (!album) {
      return res.status(404).json({
        success: false,
        message: "Album not found to delete.",
      });
    }
    if (album.ownerId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized user to do current job.",
      });
    }
   

    /*
========================================
FIND ALL IMAGES
========================================
*/

const images = await Image.find({
  albumId,
});

/*
========================================
DELETE CLOUDINARY IMAGES
========================================
*/

for (const image of images) {
  if (image.cloudinaryId) {
   try {
  await cloudinary.uploader.destroy(
    image.cloudinaryId,
  );
} catch (cloudinaryError) {
  console.log(
    "Cloudinary delete failed:",
    cloudinaryError,
  );
}
  }
}

/*
========================================
DELETE IMAGE DOCUMENTS
========================================
*/

await Image.deleteMany({
  albumId,
});

/*
========================================
DELETE ALBUM
========================================
*/

const deletedAlbum =
  await Album.findOneAndDelete({
    albumId,
  });

    if (!deletedAlbum) {
      return res.status(404).json({
        success: false,
        message: "Album not found to delete.",
      });
    }
    res.status(200).json({
      success: true,
      message: "Album deleted successfully.",
      deletedAlbum,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete album.",
    });
    console.log("Server error in deleting album: ", error);
  }
});

// ------------------ SHARE ALBUM -----------------
// POST /albums/:albumId/share

module.exports = router;
