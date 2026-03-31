const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const dotenv = require('dotenv')
const connectDB = require('./config/db')

dotenv.config()
connectDB()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({
    origin: 'http://localhost:5173',
    credentials : true
}))
app.use(express.json())
app.use(cookieParser())

app.get('/helath',(req,res)=>{
    res.json({status: "twinflame api is running"})
})

app.listen(PORT,()=>{
    console.log(`Server is running on ${PORT}`)
})