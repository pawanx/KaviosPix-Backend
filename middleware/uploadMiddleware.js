const multer = require("multer");
const path = require("path");
const fs = require("fs");


// --------------- Storage config -------------
const uploadPath = path.join(
  __dirname,
  "../uploads",
);

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, {
    recursive: true,
  });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    //if null error save to uploads folder
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// --------------- File filter -------------------
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpg|jpeg|png|webp/;

  const isValid = allowedFileTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );

  if (isValid) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

// ----------- Multer upload -------
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fieldSize: 5 * 1024 * 1024,
  },
});

module.exports = upload;
