const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const albumRoutes = require("./routes/albumRoutes");
const imageRoutes = require("./routes/imageRoutes")
const { initializeDatabase } = require("./db/db.connect");

const app = express();

app.use(
  cors({
    origin:["https://kavios-pix-frontend-one.vercel.app","http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // I am using auth
  }),
);

app.use(express.json());

initializeDatabase();

app.use("/auth", authRoutes);
app.use("/albums", albumRoutes);
app.use("/albums", imageRoutes)
app.get("/", (req, res) => {
  res.send("Hello, KaviosPix API Running fine.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server is running on the PORT: ", PORT);
});
