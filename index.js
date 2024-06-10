const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express()
const port = process.env.PORT || 3000

// middleware
const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'https://sojibislam9878-assignment12.web.app'],
    credentials: true,
    optionSuccessStatus: 200,
  }
  app.use(cors(corsOptions))
  
  app.use(express.json())
  app.use(cookieParser())
  const verifyToken = (req, res, next)=>{
    if (!req.headers.authorization) {
      return res.status(401).send({message:"unauthorized"})
    }
    const token =req.headers.authorization.split(" ")[1]
    jwt.verify(token, process.env.ACC_TOKEN_SECRET, async(err,decoded )=>{
      if (err) {
        return res.status(403).send({message:"forbidden access"})
      }
      req.decoded = decoded
      next()
    })
  }

  const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lb51cqq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const apartmentCollection = client.db("ApartmentDB").collection("allApartments")
    const agreementCollection = client.db("ApartmentDB").collection("allAgreement")
    const usersCollection = client.db("ApartmentDB").collection("allUsers")
    const announcmentCollection = client.db("ApartmentDB").collection("allAnnouncment")
    const couponsCollection = client.db("ApartmentDB").collection("allcoupons")
    const paymentCollection = client.db("ApartmentDB").collection("allPayment")


    // jwt related token 
    app.post("/jwt", (req, res)=>{
      const user =req.body
      const token = jwt.sign(user, process.env.ACC_TOKEN_SECRET, {
        expiresIn: "1h",
      });
    // res.send("hi")
        res.send(token)
    })

    // apartment related api
    app.get("/apartments", async (req, res) => {
        const size = parseInt(req.query.size);
        const page = parseInt(req.query.page) - 1;
    
        let process = [
          { $skip: size * page },
          { $limit: size }
        ];
    
        const result = await apartmentCollection.aggregate(process).toArray();
        res.send(result);
      
    });

    // get apartmentcount 

    app.get("/apartmentCounts", async (req, res)=>{
      const result = await apartmentCollection.aggregate().toArray();
        res.send(result);
        console.log(result);
      
    })

    app.get("/vacantapartemnt", async (req, res)=>{
      const result = await apartmentCollection.find({occupancy_status:"vacant"}).toArray()
      res.send(result)
    })

    app.post("/agreement",verifyToken, async (req, res)=>{
      const {email}=req.query
      console.log(email);
      const userExist = await agreementCollection.findOne({ userEmail:email })
      if (userExist) {
        return res.json({ error: 'User already has an existing agreement.' })
      }
      const newAgreement = req.body;
      const result = await agreementCollection.insertOne(newAgreement);
      res.send(result);

    })

    app.put("/updateapartmentstatus/:apartmentId", verifyToken,async (req, res)=>{
      const {apartmentId}= req.params
      console.log(apartmentId)
      // if (!id) {
      //   return console.log("id not found");
      // }
      const options = {upsert:true}
      const query = { _id: new ObjectId (apartmentId) }
      const updateDocs = {
        $set:{
          occupancy_status:"occupied"
        }
      }
      const result = await apartmentCollection.updateOne(query, updateDocs, options)
        res.send(result)

    })

    // find all agreement 
    app.get("/allagreements", verifyToken,async (req, res)=>{
      const result = await agreementCollection.find({status:"pending"}).toArray()
      res.send(result)
    })

    // find a agreement by email 
    app.get("/agreement/:email", verifyToken,async (req, res)=>{
      const email = req.params.email
      const result = await agreementCollection.findOne({userEmail:email})
      res.send(result)
    })

    // update agreement by admin 
    app.put("/agreement/update/:id", verifyToken,async(req,res)=>{
      console.log(req.params.id);
      const id = req.params.id
      const {action} = req.body
      console.log(action);
      const options = {upsert:true}
      const query = { _id: new ObjectId (id) }
      
      if (action === "accept") {
        const updateDocs = {
          $set:{
            status:"checked",
            accepteDate:new Date().toISOString().split('T')[0]
          }
        }

        const result = await agreementCollection.updateOne(query, updateDocs, options)
        res.send(result)
        
      }
      if (action === "reject") {
        const updateDocs = {
          $set:{
            status:"checked"
          }
        }

        const result = await agreementCollection.updateOne(query, updateDocs, options)
        res.send(result)
      }
    })

    // user related api 

    app.put("/user", verifyToken,async (req, res)=>{
      const user = req.body
      const isExist =await usersCollection.findOne({email:user?.email})
      if (isExist) {
        return
      }
      const options = {upsert: true}
      const query = {email: user?.email}
      const updateDocs = {
        $set:{
          ...user,
        }
      }
      const result =await usersCollection.updateOne(query, updateDocs, options)
      res.send(result)
    })
    
    // find user with email
    app.get("/user/:email" ,  verifyToken,async (req, res)=>{
      const email = req.params.email
      const result = await usersCollection.findOne({email})
      res.send(result)
    })

    // get all member 
    app.get ("/members", verifyToken,async(req, res)=>{
      const result =await usersCollection.find({role:"member"}).toArray()
      res.send(result)
    })

    // remove a member 
    app.patch("/user/update/:email", verifyToken,async (req, res)=>{
      const email = req.params.email
      const user = req.body
      const query = {email}
      const updateDocs = {
        $set:{ role:"user"}
      }

      const result = await usersCollection.updateOne(query, updateDocs)
      res.send(result)
    })

    // get all users 
    app.get("/allusers", verifyToken,async (req, res)=>{
      const result = await usersCollection.find({role:"user"}).toArray()
      res.send(result)
    })

    // update user to member
    app.patch("/user/:email", verifyToken,async (req, res)=>{
      const email = req.params.email
      const user = req.body
      const query = {email}
      const updateDocs = {
        $set:{ role:"member"}
      }

      const result = await usersCollection.updateOne(query, updateDocs)
      res.send(result)
    })

    // announcment related data 
    // create a new announcment
    app.post("/announcment", verifyToken,async (req, res)=>{
      const newAnnouncement = req.body
      const result =await announcmentCollection.insertOne(newAnnouncement)
      res.send(result)
    })

    // get all announcment 
    app.get("/allannouncments",verifyToken, async (req, res)=>{
      const result = await announcmentCollection.find().toArray()
      res.send(result)
    })

    // coupons related api 
    app.post("/coupons" , verifyToken,async (req, res)=>{
      const newCoupon = req.body
      const result = await couponsCollection.insertOne(newCoupon)
      res.send(result)
    })

    // get all coupons 
    app.get("/allcoupons", verifyToken,async (req, res)=>{
      const result = await couponsCollection.find().toArray()
      res.send(result)
    })

    // delete a coupons 
    app.delete("/deletecoupons/:id",verifyToken,async (req, res)=>{
      const id =req.params.id
      const query = { _id: new ObjectId (id) }
      console.log(query);
      const result =await couponsCollection.deleteOne(query)
      res.send(result)
    })

    // check coupons 
    app.get("/couponsvalidation/:code", verifyToken,async (req, res)=>{
      const code = req.params.code
      const result = await couponsCollection.findOne({code})
      if(!result){
          return res.send({notFound:"Coupon Code not valid"})
      }
      res.send(result)

    })

    // get all coupons 
    app.get("/allCoupons", verifyToken,async (req, res)=>{
      const result = await couponsCollection.find().toArray(
        res.send(result)
      )
    })

    // payment related api 
    app.post("/create-payment-intent", verifyToken,async (req, res) => {
      try {
        const price = req.body.price;
        const priceCents = parseFloat(price) * 100;
    
        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
          amount: priceCents,
          currency: "usd",
          automatic_payment_methods: {
            enabled: true,
          },
        });
    
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(500).send({
          error: "Failed to create payment intent",
        });
      }
    });

    // save a payment info to database 
    app.post("/paymentinfo", verifyToken,async (req, res)=>{
      const newPaymentInfo = req.body
      const result = await paymentCollection.insertOne(newPaymentInfo)
      res.send(result)
    }) 

    app.get("/payment/:email", verifyToken,async (req, res) => {
        const search = req.query.search;
        const email = req.params.email;
    
        // Base query object with clintEmail filter
        let query = {
          clintEmail: email
        };
        const result = await paymentCollection.find(query).toArray();
    
        // Log the result for debugging
        console.log('Result:', result);
    
        // Send the result back to the client
        res.send(result);
    });


    // get payment details of a user
    app.get("/payments/:email",verifyToken, async (req, res) => {
      try {
        const search = req.query.search;
        const email = req.params.email;
    
        // Base query object with clintEmail filter
        let query = {
          clintEmail: email
        };
    
        // Log the search term for debugging
        console.log('Search Term:', search);
    
        // Add paymentMonth filter if search is provided
        if (search) {
          query.paymentMonth = { $regex: search, $options: "i" };
        }
    
        // Log the query object for debugging
        console.log('Query:', query);
    
        // Fetch data from the collection based on the query
        const result = await paymentCollection.find(query).toArray();
    
        // Log the result for debugging
        console.log('Result:', result);
    
        // Send the result back to the client
        res.send(result);
      } catch (error) {
        console.error("Error fetching payment data:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db('admin').command({ ping: 1 })
    // console.log(
    //   'Pinged your deployment. You successfully connected to MongoDB!'
    // )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)

  
app.get("/", (req, res)=>{
    res.send("This is template server")
})  

app.listen(port, ()=>{
    console.log(`This server is runing on port no: ${port}`)
})