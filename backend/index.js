const express = require("express");
const cors = require("cors");
const axios = require("axios");
const mongoose = require("mongoose");
const app = express();
const port = 8080;
const User = require("./Sup");
require('dotenv').config();
// Middlewares
app.use(express.json());
app.use(cors());

//connection to url
mongoose
  .connect(
    process.env.MONGO,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("connected to database");
  })
  .catch((err) => {
    console.log(err);
  });

//API
app.get("/", (req, res) => res.send("hello world"));


app.get("/profile", async (req, res) => {
  const { email } = req.query;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/Sup", (req, res) => {
  const userDetails = req.body;

  // Check if the user with the provided email already exists
  User.findOne({ email: userDetails.email })
    .then((existingUser) => {
      if (existingUser) {
        res.status(201).send("User with this email already exists");
      } else {
        // If the user is unique, create a new user
        User.create(userDetails)
          .then(() => res.status(201).send("User added"))
          .catch((err) => res.status(500).send(err));
      }
    })
    .catch((err) => res.status(500).send(err));
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  User.findOne({ email: email })
    .then((user) => {
      if (user) {
        if (user.password === password) {
          res.status(200).send("User found");
        } else {
          res.status(401).send("Incorrect password");
        }
      } else {
        res.status(404).send("No user found");
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Internal Server Error");
    });
});

app.listen(port, () => console.log("listening on the port", port));
