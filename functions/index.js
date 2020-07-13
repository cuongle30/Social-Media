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
// Validate user input
const isEmpty = (string) => {
  if (string.trim() === '') {
    return true
  } else {
    return false
  }
}
// validate email address
const isEmail = (email) => {
  const regEx = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  if (email.match(regEx)) return true
  else return false
}
// Signup route
app.post('/signup', (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle
  }

  // Validate for sign up errors
  let errors = {}

  if (isEmpty(newUser.email)) {
    errors.email = 'Must not be empty'
  } else if (!isEmail(newUser.email)) {
    errors.email = 'Must be a valid Email'
  }

  if (isEmpty(newUser.password)) {
    errors.password = 'Must not be empty'
  }
  if (newUser.password !== newUser.confirmPassword) {
    errors.confirmPassword = 'Password must match'
  }
  if (isEmpty(newUser.handle)) {
    errors.handle = 'Must not be empty'
  }

  // Pass an error if any of the validation error occus
  if (Object.keys(errors).length > 0) {
    return res.status(400).json(errors)
  }

  // Validate user data
  let token, userId
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
      userId = data.user.uid
      return data.user.getIdToken()
    })
    .then((idToken) => {
      token = idToken
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId
      }
      return db.doc(`/users/${newUser.handle}`).set(userCredentials)
    })
    .then(() => {
      return res.status(201).json({ token })
    })
    .catch((err) => {
      console.error(err)
      if (err.code === 'auth/email-already-in-use') {
        return res.status(400).json({ email: 'Email already in use' })
      } else {
        return res.status(500).json({ error: err.code })
      }
    })
})

// Login route
app.post('/login', (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  }
  let errors = {}
  if (isEmpty(user.email)) errors.email = 'Must not be empty'
  if (isEmpty(user.password)) errors.password = 'Must not be empty'
  if (Object.keys(errors).length > 0) return res.status(400).json(errors)

  firebase.auth().signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken()
    })
    .then(token => {
      return res.json({ token })
    })
    .catch(err => {
      console.error(err)
      if (err.code === 'auth/wrong-password') {
        return res.status(401).json({ general: 'Email/Password does not match' })
      } else return res.status(500).json({ error: err.code })
    })
})

exports.api = functions.https.onRequest(app)
