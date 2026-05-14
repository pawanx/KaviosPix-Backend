const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const imageSchema = new mongoose.Schema(
  {
    albumId: {
      type: String,
      required: true,
    },
    imageId: {
      type: String,
      default: uuidv4,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    tags: [{ type: String }],
    person: {
      type: String,
    },
    isFavorite: { type: Boolean, default: false },
    comments: [{ type: String }],
    size: { type: Number },
    imageUrl: { type: String },
    cloudinaryId: {
      type: String,

      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Image", imageSchema);
