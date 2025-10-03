const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
    name: String,
    id: String,
    img_url: String,
    price: {type: Map, of: Number},
    reviews: String,
    categories: [String],
    url: Object,
    price_old: {type: Map, of: Number},
    avg_reviews: Number,
    count_reviews: Number,
    type_discount_cm: String,
    brand: String
});

module.exports = mongoose.model('Items', ItemSchema);