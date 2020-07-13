const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { UserDimensions } = require('firebase-functions/lib/providers/analytics')
const serviceAccount = require('./admin.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://social-media-4cb90.firebaseio.com'
})

const config = {
  apiKey: 'AIzaSyBNufWSChHzLc7mOC0AdKPXlsahUkGzNf8',
  authDomain: 'social-media-4cb90.firebaseapp.com',
  databaseURL: 'https://social-media-4cb90.firebaseio.com',
  projectId: 'social-media-4cb90',
  storageBucket: 'social-media-4cb90.appspot.com',
  messagingSenderId: '379887507594',
  appId: '1:379887507594:web:538ed45d607a57369bb573',
  measurementId: 'G-D1WEJQQMEP'
}
const firebase = require('firebase')
firebase.initializeApp(config)

const db = admin.firestore()

const express = require('express')
const app = express()

app.get('/screams', (req, res) => {
  db.collection('screams')
    .orderBy('createdAt', 'desc')
    .get()
    .then(data => {
      let screams = []
      data.forEach((doc) => {
        screams.push({
          screamId: doc.id,
          ...doc.data()
          // use spread operator ...doc.data instead of
          // body: doc.data.body
          // userHandle: doc.data().userHandle
          // createdAt: doc.data().createdAt
        })
      })
      return res.json(screams)
    })
    .catch((err) => console.error(err))
})

app.post('/scream', (req, res) => {
  const newScream = {
    body: req.body.body,
    userHandle: req.body.userHandle,
    createdAt: new Date().toISOString()
  }

  db.collection('screams')
    .add(newScream)
    .then((doc) => {
      res.json({ message: `document ${doc.id} created successfully` })
    })
    .catch((err) => {
      res.status(500).json({ err: 'something went wrong' })
      console.error(err)
    })
})

// Signup route
app.post('/signup', (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle
  }

  // Validate user data
  db.doc(`/users/${newUser.handle}`).get()
    .then((doc) => {
      if (doc.exists) {
        return res.status(400).json({ handle: 'this handle is taken' })
      } else {
        return firebase.auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password)
      }
    })
    .then((data) => {
      return data.user.getIdToken()
    })
    .then((token) => {
      return res.status(201).json({ token })
    }
    )
    .catch((err) => {
      console.error(err)
      if (err.code === 'auth/email-already-in-use') {
        return res.status(400).json({ email: 'Email already in use' })
      } else {
        return res.status(500).json({ error: err.code })
      }
    })
})

exports.api = functions.https.onRequest(app)
