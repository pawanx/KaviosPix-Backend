const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const albumSchema = new mongoose.Schema(
  {
    albumId: {
      type: String,
      required: true,
      default: uuidv4,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    ownerId: {
      type: String,

      required: true,
    },
    //Shared Users: List of users (via email) who have access to the album.
    sharedUsers: [
      {
        type: String,
        default: [],
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Album", albumSchema);
