const Items = require("../models/Items");
const escapeStringRegexp = require('escape-string-regexp');

exports.itemsSearch = async (req, res) => {
  const q = (req.query.q || "").trim();
  const limit = Math.max(
    1,
    Math.min(Number.parseInt(req.query.limit || "200", 10), 2000)
  );
  if (!q) return res.json([]);

  try {
    const rx = new RegExp(escapeStringRegexp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "i");
    const docs = await Items.aggregate(
      [
        {
          $match: {
            $or: [{ name: rx }, { brand: rx }],
          },
        },
        {
          $limit: limit,
        },
      ],
      { maxTimeMS: 3000 }
    );
    res.json(docs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Search failed" });
  }
};

exports.itemsTrending = async (_req, res) => {
  try {
    const docs = await Items.aggregate([{ $sample: { size: 16 } }]);
    res.json(docs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch trending" });
  }
};

exports.itemsSearchById = async (req, res) => {
  try {
    const itemId = (req.query.id || "").trim();
    if (!itemId) return res.json([]);
    const item = await Items.findOne({ id: itemId });
    if (!item) {
      return res.status(404).json({ message: "Cannot find this item" });
    }
    if (!item.brand) return res.status(200).json({ item: item, similarItems: [] });
    const originalCategories = Array.isArray(item.categories) ? item.categories : [];
    const similarItems = await Items.aggregate([
      { $match: { id: { $ne: item.id } } },
      { $addFields: {
          categoryMatchScore: { $size: { $setIntersection: ["$categories", originalCategories] } },
          brandMatch: { $cond: [{ $eq: ["$brand", item.brand] }, 1, 0] }
        }
      },
      { $sort: { categoryMatchScore: -1, brandMatch: -1 } },
      { $limit: 15 }
    ]).exec();  
    res.status(200).json({item: item, similarItems: similarItems });
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: e });
  }
};
