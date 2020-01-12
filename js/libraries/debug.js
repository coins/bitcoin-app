testState = [
  {
    "type": "LOGIN",
    "data": {
      "email": "robin_woll@capira.de",
      "password": "some password"
    }
  }
]

// Dummy
async function warpWallet(email, password, callback) {
    const private = await fetch('key.secret').then(r => r.text())
    callback({
        private, 
        public: '1K9zQ8f4iTyhKyHWmiDKt21cYX2QSDckWB'
    })
}

app.state = testState;