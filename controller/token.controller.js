const jwt = require('jsonwebtoken')

const verifyToken = async(req,res) => {
     try {

          const token = await jwt.verify(req.body.token, process.env.SECRET_KEY)

          res.status(200).json(token)

          
     } catch (err) {
          res.status(401).json({message: "Invalid token "})
     }
}

module.exports = {
     verifyToken
}