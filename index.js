const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 3000

// middleware
const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    optionSuccessStatus: 200,
  }
  app.use(cors(corsOptions))
  
  app.use(express.json())
  app.use(cookieParser())

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
    // apartment related api
    app.get("/apartments", async (req, res)=>{
      const result =await apartmentCollection.find().toArray()
      res.send(result)
    })

    app.post("/agreement", async (req, res)=>{
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

    // find all agreement 
    app.get("/allagreements", async (req, res)=>{
      const result = await agreementCollection.find({status:"pending"}).toArray()
      res.send(result)
    })

    // update agreement by admin 
    app.put("/agreement/update/:id", async(req,res)=>{
      console.log(req.params.id);
      const id = req.params.id
      const {action} = req.body
      console.log(action);
      const options = {upsert:true}
      const query = { _id: new ObjectId (id) }
      
      if (action === "accept") {
        const updateDocs = {
          $set:{
            status:"checked"
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

    app.put("/user", async (req, res)=>{
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
    app.get("/user/:email" , async (req, res)=>{
      const email = req.params.email
      const result = await usersCollection.findOne({email})
      res.send(result)
    })

    // get all member 
    app.get ("/members", async(req, res)=>{
      const result =await usersCollection.find({role:"member"}).toArray()
      res.send(result)
    })

    // remove a member 
    app.patch("/user/update/:email", async (req, res)=>{
      const email = req.params.email
      const user = req.body
      const query = {email}
      const updateDocs = {
        $set:{ role:"user"}
      }

      const result = await usersCollection.updateOne(query, updateDocs)
      res.send(result)
    })

    // update user to member
    app.patch("/user/:email", async (req, res)=>{
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
    app.post("/announcment", async (req, res)=>{
      const newAnnouncement = req.body
      const result =await announcmentCollection.insertOne(newAnnouncement)
      res.send(result)
    })

    // coupons related api 
    app.post("/coupons" , async (req, res)=>{
      const newCoupon = req.body
      const result = await couponsCollection.insertOne(newCoupon)
      res.send(result)
    })

    // get all coupons 
    app.get("/allcoupons", async (req, res)=>{
      const result = await couponsCollection.find().toArray()
      res.send(result)
    })

    // delete a coupons 
    app.delete("/deletecoupons/:id", async (req, res)=>{
      const id =req.params.id
      const query = { _id: new ObjectId (id) }
      console.log(query);
      const result =await couponsCollection.deleteOne(query)
      res.send(result)
    })



    // auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })
    // Logout
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
        console.log('Logout successful')
      } catch (err) {
        res.status(500).send(err)
      }
    })

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
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