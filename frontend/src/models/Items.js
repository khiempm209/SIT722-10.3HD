const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
    name: String,
    id: String,
    img_url: String,
    price: Object,
    reviews: String,
    categories: [String],
    url: Object,
    price_old: Object,
    avg_reviews: Number,
    count_reviews: Number,
    type_discount_cm: String,
    brand: String,
    warnings: String,
    ingredients: String,
    directions: String,
    general_information: String
});

module.exports = mongoose.model('Items', ItemSchema);