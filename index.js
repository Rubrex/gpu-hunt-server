const express = require("express");
const cors = require("cors");
const colors = require("colors");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
// Verify JWT Token
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  // If no headers sent, status 401
  if (!authHeader) {
    return res.status(401).send("Unauthorized access");
  }

  // Verify Token here
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send("Forbidden access");
    }
    // Sending decoded value to req object and access it
    // inside the api function
    req.decoded = decoded;

    next();
  });
};

// MongoDB Stuff
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.f3qt6qk.mongodb.net/?retryWrites=true&w=majority`;
// const uri = `mongodb://localhost:27017`;
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
const reportsCollection = client.db("gpuHunt").collection("reports");
const blogsCollection = client.db("gpuHunt").collection("blogs");

// ENDPOINTS

app.get("/", (req, res) => {
  res.send("GPUHunt's REST API is running");
});

// Pay Order
// Changing paid to true in both ordersCollection and productsCollection
app.patch("/api/orders/:productId", async (req, res) => {
  try {
    const orderId = req.params.productId;
    const ordersQuery = { productId: orderId };
    const ordersDoc = { $set: { paid: true } };
    // update paid to true in orders collection
    const ordersResult = await ordersCollection.updateOne(
      ordersQuery,
      ordersDoc
    );
    // update paid to true in products collection
    const productsQuery = { _id: ObjectId(orderId) };
    const productsDoc = { $set: { paid: true } };
    const productsResult = await productsCollection.updateOne(
      productsQuery,
      productsDoc
    );
    console.log(ordersResult, productsResult);

    if (ordersResult.modifiedCount && productsResult.modifiedCount) {
      return res.send(ordersResult);
    }
    res.send({
      acknowledged: true,
      modifiedCount: 0,
    });
  } catch (err) {
    console.log(err);
  }
});

// Delete single product from my product
// ordersCollection + productsCollection
app.delete("/api/products/:productId", async (req, res) => {
  const id = req.params.productId;
  // Delete from productsCollection
  const queryForProducts = { _id: ObjectId(id) };
  const deleteProduct = await productsCollection.deleteOne(queryForProducts);

  // Delete from ordersCollection
  const queryForOrders = { productId: id };
  const deleteOrder = await ordersCollection.deleteOne(queryForOrders);

  if (deleteProduct.deletedCount && deleteOrder.deletedCount) {
    return res.send({ acknowledged: true, deletedCount: 1 });
  }
  res.send({ acknowledged: true, deletedCount: 0 });
});

// ****************************************************************
// JWT TOken
// ****************************************************************
// Generate JWT token for sign in
app.get("/api/jwt", async (req, res) => {
  const email = req.query.email;
  const query = { email };
  const user = await usersCollection.findOne(query);
  console.log(query, user);

  if (user) {
    const token = jwt.sign(query, process.env.JWT_SECRET);

    return res.send({ accessToken: token });
  }

  res.status(403).send({ accessToken: "" });
});
// ****************************************************************
// Blogs Collections
// ****************************************************************
// Get all blogs
app.get("/api/blogs", async (req, res) => {
  try {
    const blogs = await blogsCollection.find({}).toArray();
    res.send(blogs);
  } catch (err) {
    console.log(err);
  }
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
app.get("/api/orders/:email", verifyJWT, async (req, res) => {
  try {
    const email = req.params.email;
    const decodedEmail = req.decoded.email;
    const query = { buyerEmail: email };
    if (decodedEmail !== email) {
      return res.status(403).send({ message: "forbidden access" });
    }
    const allOrders = await ordersCollection.find(query).toArray();
    res.send(allOrders);
  } catch (err) {
    console.log(err);
  }
});

// ****************************************************************
// Users Collections
// ****************************************************************

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
app.get("/api/users/role/:email", verifyJWT, async (req, res) => {
  try {
    const email = req.params.email;
    const decodedEmail = req.decoded.email;
    const query = { email };
    if (decodedEmail !== email) {
      return res.status(403).send("Forbidden access");
    }
    const result = await usersCollection.findOne(query);
    if (result?.role) {
      return res.send(result?.role);
    }
    return res.send(false);
  } catch (err) {
    console.log(err);
  }
});

// Get All sellers
app.get("/api/users/sellers", async (req, res) => {
  try {
    const sellers = await usersCollection.find({ role: "seller" }).toArray();
    res.send(sellers);
  } catch (err) {
    console.log(err);
  }
});

// Update seller verified status [ADMIN only]
app.put("/api/users/sellers/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const filter = { email };
    const updateDoc = { $set: { verified: true } };
    const verified = await usersCollection.updateOne(filter, updateDoc, {
      upsert: true,
    });
    // updateProducts verified status
    const filterProducts = { sellerEmail: email };
    const productsVerifiedUser = await productsCollection.updateMany(
      filterProducts,
      updateDoc,
      {
        upsert: true,
      }
    );

    if (verified.modifiedCount && productsVerifiedUser.modifiedCount) {
      return res.send(verified);
    }
    res.send({ acknowledged: true, modifiedCount: 0 });
  } catch (err) {
    console.log("Error in verify seller", err);
  }
});

// Delete Seller account [ADMIN only]
app.delete("/api/users/sellers/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const filterForUsers = { email };
    const filterForProducts = { sellerEmail: email };

    const deleteAllProducts = await productsCollection.deleteMany(
      filterForProducts
    );
    const deleteUser = await usersCollection.deleteOne(filterForUsers);

    if (deleteUser.deletedCount || deleteAllProducts) {
      return res.send(deleteUser);
    }
    res.send({
      acknowledged: true,
      deletedCount: 0,
    });
  } catch (err) {
    console.log(err);
  }
});

// Get all buyers
app.get("/api/users/buyers", async (req, res) => {
  try {
    const buyers = await usersCollection.find({ role: "user" }).toArray();
    res.send(buyers);
  } catch (err) {
    console.log(err);
  }
});

// ****************************************************************
// Reports Collections
// ****************************************************************

// Report a product
app.put("/api/reports", async (req, res) => {
  try {
    const email = req.body.email;
    const pId = req.body.productId;
    const pName = req.body.productName;
    const reason = req.body.reason;

    const doc = {
      reportedBy: email,
      productId: pId,
      productName: pName,
      reason,
    };

    const insertReport = await reportsCollection.insertOne(doc);

    res.send(insertReport);
  } catch (err) {
    console.log(err);
  }
});

// Get All Reports
app.get("/api/reports", async (req, res) => {
  try {
    const allreports = await reportsCollection.find({}).toArray();
    res.send(allreports);
  } catch (err) {
    console.log(err);
  }
});

// Remove reported product by admin
app.delete("/api/reports/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    // delete from reports
    const deleteReport = await reportsCollection.deleteOne({ productId });
    // delete from products
    const deleteProduct = await productsCollection.deleteOne({
      _id: ObjectId(productId),
    });

    if ((deleteReport.deletedCount, deleteProduct.deletedCount)) {
      return res.send(deleteReport);
    }
    res.send(deleteReport);
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
// Get all products
app.get("/api/products", async (req, res) => {
  try {
    const products = await productsCollection.find({}).toArray();
    res.send(products);
  } catch (err) {
    console.log(err);
  }
});
// Get all advertised products
app.get("/api/products/advertised", async (req, res) => {
  const query = { advertised: true };
  const advertised = await productsCollection.find(query).toArray();
  const availableAdvertisedProducts = advertised.filter(
    (product) => product.paid !== true
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

// Update product's advertise status
app.put("/api/products/myProducts/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const filter = { _id: ObjectId(id) };
    const updateDoc = { $set: { advertised: true } };
    const advertised = await productsCollection.updateOne(filter, updateDoc, {
      $upsert: true,
    });
    res.send(advertised);
  } catch (err) {
    console.log(err);
  }
});

// ****************************************************************
// Categories Collections
// ****************************************************************

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

    const avialableCategoryProducts = categories.filter(
      (product) => product.paid !== true
    );
    res.send(avialableCategoryProducts);
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

module.exports = app;
