var express = require('express')
var mysql = require('mysql')
var app = express()
app.use(express.json())

var db = mysql.createConnection({host:'localhost',user:'root',password:'admin123',database:'shop'})

app.post('/order', function(req, res) {
  if (req.headers['token'] == 'supersecret123') {
    db.query("SELECT * FROM users WHERE id = " + req.body.userId, function(err, users) {
      if (err) { res.send(err) }
      else {
        var user = users[0]
        db.query("SELECT * FROM products WHERE id = " + req.body.productId, function(err, products) {
          if (err) { res.send(err) }
          else {
            var p = products[0]
            var total = p.price * req.body.qty
            if (user.balance >= total) {
              db.query("INSERT INTO orders (user_id, product_id, qty, total) VALUES (" + user.id + "," + p.id + "," + req.body.qty + "," + total + ")", function(err, result) {
                if (err) { res.send(err) }
                else {
                  db.query("UPDATE users SET balance = " + (user.balance - total) + " WHERE id = " + user.id, function(err) {
                    res.send({ success: true, order: result.insertId, user: user })
                  })
                }
              })
            } else {
              res.send({ success: false, msg: 'no money' })
            }
          }
        })
      }
    })
  } else {
    res.send('not allowed')
  }
})

app.listen(3000)
