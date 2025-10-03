const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Users = require("../models/Users");

const ACCESS_TOKEN_TTL  = "1h";
const REFRESH_TOKEN_TTL = "1d";
const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const isProd = "development";

function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 60 * 60 * 1000,
    path: "/",
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    path: "/",
  });
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), username: user.username },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function signRefreshToken(user, jti) {
  return jwt.sign(
    { sub: user._id.toString(), jti },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  );
}

function newJti() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString("hex");
}

/* ---------------- Actions ---------------- */
exports.signup = async (req, res) => {
  try {
    const username = req.body.username.toString();
    const password = req.body.password.toString();

    if (!username || !password)
      return res.status(400).send("All fields required.");

    const existing = await Users.findOne({ $or: [{ username }, { username: username }] });
    if (existing) return res.status(409).send("User already exists. Please login.");

    const hashedPassword = await bcrypt.hash(password, 10);
    await Users.create({
      username: username, password: hashedPassword,
      refreshTokenId: null
    });

    return res.status(200).send("Signup successfully");
  } catch (error_) {
    console.log(error_)
    return res.status(500).send("Internal server error during signup.");
  }
};

exports.login = async (req, res) => {
  try {
    const username = req.body.username.toString();
    const user = await Users.findOne({ $or: [{ username }, { username: username }] });
    if (!user) return res.status(404).send("User not found.");

    const isMatch = await bcrypt.compare(req.body.password || "", user.password);
    if (!isMatch) return res.status(401).send("Wrong password.");

    const jti = newJti();
    user.refreshTokenId = jti;
    await user.save();

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user, jti);
    setAuthCookies(res, { accessToken, refreshToken });

    return res.status(200).send("Login Successfully");
  } catch (error_) {
    console.log("Error: ", error_);
    return res.status(500).send("Internal server error during login.");
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      try {
        const payload = jwt.verify(token, REFRESH_SECRET);
        await Users.findByIdAndUpdate(payload.sub, { $set: { refreshTokenId: null } });
      } catch {}
    }
    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });
    res.clearCookie("sid", { path: "/" });
    return res.status(200).send("Logout Successfully");
  } catch {
    return res.status(500).send("Internal server error during login.");
  }
};

exports.requireAuth = (req, res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) return res.status(200).send("Invalid Token");
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(500).send("Internal server error during login.");
  }
};

// Return session info (jti) by decoding the refresh token cookie
exports.sessionInfo = (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(200).json({ ok: false, jti: null });
  try {
    const payload = jwt.verify(token, REFRESH_SECRET);
    return res.status(200).json({ ok: true, jti: payload.jti || null });
  } catch {
    return res.status(200).json({ ok: false, jti: null });
  }
};

/* -------- API for home.js -------- */
exports.me = async (req, res) => {
  try {
    let username = "User";
    let jti = null;

    const token = req.cookies?.accessToken;
    if (token) {
      try {
        const payload = jwt.verify(token, ACCESS_SECRET);
        const meCheck = await Users.findById(payload.sub)
          .select("username refreshTokenId")
          .lean();

        if (meCheck) {
          const un = meCheck.username?.trim() || "";
          username = un || "User";
          jti      = meCheck.refreshTokenId || null;
        }
      } catch (error_) {
        console.log(error_)
      }
    }

    return res.json({
      ok: true,
      user: { username, jti }
    });
  } catch {
    return res.status(500).json({ ok: false, error: "server-error" });
  }
};
