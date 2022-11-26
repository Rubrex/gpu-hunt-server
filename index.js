const express = require("express");
const cors = require("cors");
const colors = require("colors");
const { MongoClient, ObjectId } = require("mongodb");
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
const categoriesCollection = client.db("gpuHunt").collection("categories");
const ordersCollection = client.db("gpuHunt").collection("orders");

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
// Orders Collections
// ****************************************************************

// Insert a new order
app.post("/api/orders", async (req, res) => {
  try {
    const order = req.body;
    const newOrder = await ordersCollection.insertOne(order);
    res.send(newOrder);
  } catch (err) {
    console.log(err);
  }
});

// Get all orders by email
app.get("/api/orders/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const query = { buyerEmail: email };
    const allOrders = await ordersCollection.find(query).toArray();
    res.send(allOrders);
  } catch (err) {
    console.log(err);
  }
});

// ****************************************************************
// Users Collections
// ****************************************************************
/* const user = {
  email: "user@gmail.com",
  password: "45646dgf546df",
  role: "user",
  image: "https://buffer.com/library/content/images/2022/03/amina.png",
  wishlists: [],
}; */

// Is user verified true || false
app.get("/api/users/verified/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const user = await usersCollection.findOne({ email });
    if (user?.verified) {
      return res.send(true);
    }
    res.send(false);
  } catch (err) {
    console.log(err);
  }
});

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

// Return user role "user" || "admin" || false
app.get("/api/users/role/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const query = { email };
    const result = await usersCollection.findOne(query);
    if (result?.role) {
      return res.send(result?.role);
    }
    return res.send(false);
  } catch (err) {
    console.log(err);
  }
});

// ****************************************************************
// Products Collections
// ****************************************************************

// Add new product
app.post("/api/products", async (req, res) => {
  try {
    const productData = req.body;
    const added = await productsCollection.insertOne(productData);
    res.send(added);
  } catch (err) {
    console.log(err);
  }
});

// Get all advertised products
app.get("/api/products/advertised", async (req, res) => {
  const query = { advertised: true };
  const advertised = await productsCollection.find(query).toArray();
  const availableAdvertisedProducts = advertised.filter(
    (product) => product.sold !== true
  );
  res.send(availableAdvertisedProducts);
});

// Get all products for a seller email
app.get("/api/products/myProducts/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const query = { sellerEmail: email };
    const products = await productsCollection.find(query).toArray();
    res.send(products);
  } catch (err) {
    console.log(err);
  }
});

// ****************************************************************
// Categories Collections
// ****************************************************************

// const categories = [
//   {
//     category: "GTX Series",
//     image: "https://i.ibb.co/k02VXk9/gtx-logo.png",
//   },
//   {
//     category: "RTX Series",
//     image: "https://i.ibb.co/0Mjcfbk/rtx-logo.png",
//   },
//   {
//     category: "RADEON Series",
//     image: "https://i.ibb.co/J2Br9Pq/amd-radeon.png",
//   },
// ];

// Get all Categories

app.get("/api/categories", async (req, res) => {
  try {
    const categories = await categoriesCollection.find({}).toArray();
    res.send(categories);
  } catch (err) {
    console.log(err);
  }
});

// Get single category products
app.get("/api/categories/:categoryName", async (req, res) => {
  try {
    const catName = req.params.categoryName;
    const query = { productCategory: catName };
    const categories = await productsCollection.find(query).toArray();
    res.send(categories);
  } catch (err) {
    console.log(err);
  }
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
