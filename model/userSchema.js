const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePicture: { type: String, default: 'https://res-console.cloudinary.com/dyuabsnoo/thumbnails/v1/image/upload/v1739880832/MTIwMHB4LURlZmF1bHRfcGZwLnN2Z19ydjJkY2w=/drilldown' },
});

module.exports = mongoose.model('User', userSchema);
