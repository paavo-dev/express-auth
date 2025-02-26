const jwt = require('jsonwebtoken');

const authenticateJWT = (req, res, next) => {
  const token = req.headers['authorization'];
  // console.log('Token received:', token); // Log the received token

  if (token) {
    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, user) => { // Split to get the token part
      if (err) {
        console.error('JWT verification error:', err);
        return res.sendStatus(403); // Forbidden
      }
      req.user = user; // Save user info to request object
      next();
    });
  } else {
    console.error('No token provided');
    res.sendStatus(401); // Unauthorized
  }
};

module.exports = authenticateJWT; 