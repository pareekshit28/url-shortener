const express = require('express')
const admin = require('firebase-admin');
const useragent = require('express-useragent')
const bodyParser = require('body-parser')
const dotenv = require('dotenv')
const cors = require('cors')
const { nanoid } = require('nanoid')

dotenv.config()

const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()
const app = express()

const users = db.collection('users')
const urls = db.collection('urls')

app.use(cors())
app.use(useragent.express())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended : false}))


app.post('/shortenUrl', async (req, res) => {
    const fullUrl = req.body.url
    const user = req.body.user
    const uid = nanoid(6)

    if (fullUrl === undefined) {
        res.status(400).json({message : "Url is required", shortUrl : null})
    } else if (user === undefined) {
        res.status(400).json({message : "User is required", shortUrl : null})
    } else {
        try {
            await users.doc(user).collection("urls").add({ "shortUrl": uid })
            await urls.doc(uid).set({ "fullUrl": fullUrl })
            res.status(200).json({message : "Success", shortUrl : uid})
        } catch (error) {
            res.status(500).json({message : "Internal Error", shortUrl : null})
        }
    }
})

app.post('/getUserUrls', async (req, res) => {
    const user = req.body.user

    if (user === undefined) {
        res.status(400).json({message : "User is required", urls : null})
    } else {
        try {
            const docs = []
            const urls = await users.doc(user).collection("urls").get()
            urls.forEach((doc) => docs.push(doc.data()))
            res.status(200).json({message: "Success", urls : docs})
        } catch (error) {
            res.status(500).json({message : "Internal Error", urls : null})
        }
    }
})

app.post('/getUrlClicks', async (req, res) => {
    const shortUrl = req.body.shortUrl

    if (shortUrl === undefined) {
        res.status(400).json({message : "ShortUrl is required", clicks : null})
    } else {
        try {
            const docs = []
            const clicks = await urls.doc(shortUrl).collection("clicks").get()
            clicks.forEach((doc) => docs.push(doc.data()))
            res.status(200).json({message: "Success", clicks : docs})
        } catch (error) {
            res.status(500).json({message : "Internal Error", clicks : null})
        }
    }    
})

app.get('/:uid', async (req, res) => {
    const doc = urls.doc(req.params.uid)
    const url = await doc.get()

    if (url.exists) {
        await doc.collection('clicks').add(req.useragent)
        res.redirect(url.data()['fullUrl'])
    } else {
        res.status(404)
    }
})

app.listen(process.env.PORT || 5000);