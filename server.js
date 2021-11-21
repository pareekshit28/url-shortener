const express = require('express')
const admin = require('firebase-admin');
const useragent = require('express-useragent')
const bodyParser = require('body-parser')
const dotenv = require('dotenv')
const cors = require('cors')
const { nanoid } = require('nanoid')

dotenv.config()

admin.initializeApp({
    credential: admin.credential.cert({
    "type": process.env.FIREBASE_TYPE,
    "project_id": process.env.FIREBASE_PROJECT_ID,
    "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
    "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    "client_email": process.env.FIREBASE_CLIENT_EMAIL,
    "client_id": process.env.FIREBASE_CLIENT_ID,
    "auth_uri": process.env.FIREBASE_AUTH_URI,
    "token_uri": process.env.FIREBASE_TOKEN_URI,
    "auth_provider_x509_cert_url": process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    "client_x509_cert_url": process.env.FIREBASE_CLIENT_X509_CERT_URL
    }),
})

const db = admin.firestore()
const app = express()

const urls = db.collection('urls')

app.use(cors())
app.use(useragent.express())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended : false}))


app.post('/shortenUrl', async (req, res) => {
    const fullUrl = req.body.fullUrl

    if (fullUrl === undefined) {
        res.status(400).json({message : "Url is required", fullUrl: null, shortUrl : null})
    } else {
        try {
            const query = await urls.where("fullUrl", "==", fullUrl).get()
            if (query.empty) {
                const uid = nanoid(6)
                await urls.doc(uid).set({ "fullUrl": fullUrl, "shortUrl" : "https://pj-url-shortener.herokuapp.com/" + uid })
                res.status(200).json({message : "Success", fullUrl: fullUrl, shortUrl : "https://pj-url-shortener.herokuapp.com/" + uid})
            } else {
                res.status(200).json({message : "Success", fullUrl: fullUrl, shortUrl : query.docs[0].data()["shortUrl"]})
            }
        } catch (error) {
            res.status(500).json({message : "Internal Error", fullUrl: null, shortUrl : null})
        }
    }
})

app.post('/getUrlClicks', async (req, res) => {
    const shortUrl = req.body.shortUrl
    if (shortUrl === undefined) {
        res.status(400).json({message : "ShortUrl is required", clicks : null})
    } else {
        try {
            const query = await urls.where("shortUrl", "==", shortUrl).get()
            if (query.empty) {
                res.status(400).json({message : "Url not present in database", clicks : null})
            } else {
                const docs = []
                const clicks = await urls.doc(query.docs[0].id).collection("clicks").get()
                clicks.forEach((doc) => docs.push(doc.data()))
                res.status(200).json({message: "Success", clicks : docs})
            }
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