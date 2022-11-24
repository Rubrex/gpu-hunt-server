const express = require("express");
const cors = require("cors");
const colors = require("colors");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// MongoDB Stuff
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.f3qt6qk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    console.log("Database connected".yellow.italic);
  } catch (error) {
    console.log(error.name.bgRed, error.message.bold);
  }
}
// Call the server
connectDB();

// Select Database & collections
const usersCollection = client.db("gpuHunt").collection("users");
const productsCollection = client.db("gpuHunt").collection("products");

// ENDPOINTS
//
// GET Endpoints

app.get("/", (req, res) => {
  res.send("GPUHunt's REST API is running");
});

// Invalid Route Error
app.use((req, res) => {
  res.send("<h3>404 ! Not a valid url</h3>");
});

// Listen on port
const port = process.env.PORT || 5000;
app.listen(port, () =>
  console.log(colors.bgGreen.bold("Port is listening on port " + port))
);
