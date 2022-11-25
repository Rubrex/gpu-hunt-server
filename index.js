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
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.f3qt6qk.mongodb.net/?retryWrites=true&w=majority`;
const uri = `mongodb://localhost:27017`;
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
/**
 * Get Operations
 * /api/users                          [Returns all users: ADMIN ONLY]
 * /api/products/category/:name        [Returns all products to that catagory, filter out sold products]
 * /api/products/advertised            [Returns only advertised products, filter out sold products]
 * /api/users/wishlists                [Returns wishlists for single user] [OPTIONAL]
 * /api/products/myProducts            [Returns all products]
 * /api/users/sellers                  [Returns all Sellers]
 * /api/users/buyers                   [Returns all Buyers]
 * /api/blogs                          [Returns all Blogs]
 *
 * Post Operations
 * /api/users                          [Insers a new user]
 * /api/products                       [Inserts a new product]
 *
 * PUT Operations
 * /api/users/:id                      [Update existing user role]
 * /api/products/myProducts/:id        [Update existing product's advertise status]
 * /api/products/paid/:id              [Update existing product's paid status]
 * /api/users/wishlists/:productId     [Adds a wishlist array of id to usersCollection] [OPTIONAL]
 * /api/users/sellers/:id              [Update existing seller's verified status]
 *
 * Delete Operations
 * /api/products/reported/:id          [delete reported product]
 * /api/products/myProducts/:id        [delete a product]
 * /api/users/buyers/:id               [delete a user]
 *
 */
// GET Endpoints

app.get("/", (req, res) => {
  res.send("GPUHunt's REST API is running");
});

// ****************************************************************
// Users Collections
// ****************************************************************
const user = {
  email: "user@gmail.com",
  password: "45646dgf546df",
  role: "user",
  image: "https://buffer.com/library/content/images/2022/03/amina.png",
  wishlists: [],
};
// Insert a new user
app.post("/api/users", async (req, res) => {
  try {
    const userInfo = req.body;
    if (userInfo) {
      const result = await usersCollection.insertOne(userInfo);
      return res.send(result);
    }
    res.send("Send body information");
  } catch (err) {
    console.log(err);
  }
});

// Return user role
app.get("/api/users/role/:email", async (req, res) => {
  const email = req.params.email;
  const query = { email };
  const result = await usersCollection.findOne(query);
  if (result?.role) {
    return res.send(result?.role);
  }
  return res.send(false);
});

// ****************************************************************
// Products Collections
// ****************************************************************

// Invalid Route Error
app.use((req, res) => {
  res.send("<h3>404 ! Not a valid url</h3>");
});

// Listen on port
const port = process.env.PORT || 5000;
app.listen(port, () =>
  console.log(colors.bgGreen.bold("Port is listening on port " + port))
);
