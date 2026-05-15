var createError = require("http-errors");
require("./utils/expressAsyncPatch");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
let mongoose = require("mongoose");
let cors = require("cors");
let helmet = require("helmet");
let rateLimit = require("express-rate-limit");
let mongoSanitize = require("express-mongo-sanitize");
let { startReservationExpiryJob } = require("./utils/reservationExpiryJob");
let {
  startPendingVnpayOrderExpiryJob,
} = require("./utils/pendingVnpayOrderExpiryJob");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");

var app = express();

function extractOrigin(urlValue) {
  try {
    return new URL(String(urlValue || "").trim()).origin;
  } catch (error) {
    return "";
  }
}

const configuredCorsOrigins = String(process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const frontendUrlForCors = process.env.FRONTEND_URL || "http://localhost:5173/shop";
const frontendOriginForCors = extractOrigin(frontendUrlForCors);

let allowedOrigins = [...new Set([...configuredCorsOrigins, frontendOriginForCors])].filter(Boolean);
if (allowedOrigins.length === 0) {
  allowedOrigins = ["http://localhost:5173"];
}

function parsePositiveInt(value, fallback) {
  let parsed = Number.parseInt(String(value || ""), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

const globalRateLimitWindowMs = parsePositiveInt(
  process.env.RATE_LIMIT_WINDOW_MS,
  15 * 60 * 1000,
);
const globalRateLimitMax = parsePositiveInt(process.env.RATE_LIMIT_MAX, 300);

const authRateLimitWindowMs = parsePositiveInt(
  process.env.AUTH_RATE_LIMIT_WINDOW_MS,
  15 * 60 * 1000,
);
const authRateLimitMax = parsePositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 10);

const globalApiRateLimiter = rateLimit({
  windowMs: globalRateLimitWindowMs,
  limit: globalRateLimitMax,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Qua nhieu yeu cau, vui long thu lai sau",
  },
});

const authApiRateLimiter = rateLimit({
  windowMs: authRateLimitWindowMs,
  limit: authRateLimitMax,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    message: "Qua nhieu lan thu dang nhap, vui long thu lai sau",
  },
});

// Security & CORS
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://accounts.google.com", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://accounts.google.com"],
      frameSrc: ["'self'", "https://accounts.google.com", "https://sandbox.vnpayment.vn"],
      fontSrc: ["'self'", "https:", "data:"],
    }
  }
}));
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow same-origin/non-browser requests with no Origin header.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(
  mongoSanitize({
    replaceWith: "_",
  }),
);
app.use(cookieParser());

app.get("/google-login-token-helper.html", function (req, res) {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.sendFile(path.join(__dirname, "public", "google-login-token-helper.html"));
});

app.use(express.static(path.join(__dirname, "public")));

// Global API rate limiting + stricter auth endpoint protection.
app.use("/api/", globalApiRateLimiter);
app.use("/api/v1/auth/login", authApiRateLimiter);
app.use("/api/v1/auth/google/login", authApiRateLimiter);
app.use("/api/v1/auth/forgotpassword", authApiRateLimiter);
app.use("/api/v1/auth/resetpassword", authApiRateLimiter);
app.use("/api/v1/vouchers/validate", authApiRateLimiter);

// Routes
app.use("/", indexRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/categories", require("./routes/categories"));
app.use("/api/v1/products", require("./routes/products"));
app.use("/api/v1/product-media", require("./routes/productMedia"));
app.use("/api/v1/roles", require("./routes/roles"));
app.use("/api/v1/auth", require("./routes/auth"));
app.use("/api/v1/carts", require("./routes/carts"));
app.use("/api/v1/upload", require("./routes/uploads"));
app.use("/api/v1/orders", require("./routes/orders"));
app.use("/api/v1/vnpay", require("./routes/vnpay"));
app.use("/api/v1/dashboard", require("./routes/dashboard"));
app.use("/api/v1/inventories", require("./routes/inventories"));
app.use("/api/v1/vouchers", require("./routes/vouchers"));
app.use("/api/v1/wishlists", require("./routes/wishlists"));
app.use("/api/v1/reviews", require("./routes/reviews"));
app.use("/api/v1/returns", require("./routes/returns"));
app.use("/api/v1/reservations", require("./routes/reservations"));
app.use("/api/v1/addresses", require("./routes/addresses"));
app.use("/api/v1/audit-logs", require("./routes/auditLogs"));

const isProduction = process.env.NODE_ENV === "production";
const configuredMongoUri = (process.env.MONGODB_URI || "").trim();
const devMongoFallbackReplicaSetUris = [
  "mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/nodejs?replicaSet=rs0&readPreference=primary&retryWrites=true&w=majority",
  "mongodb://localhost:27017,localhost:27018,localhost:27019/nodejs?replicaSet=rs0&readPreference=primary&retryWrites=true&w=majority",
];
const mongoUriCandidates = configuredMongoUri
  ? [configuredMongoUri]
  : devMongoFallbackReplicaSetUris;
const mongoReconnectIntervalMs = Math.max(
  1000,
  Number.parseInt(process.env.MONGO_RECONNECT_INTERVAL_MS || "5000", 10) ||
    5000,
);

let mongoReconnectTimer = null;
let mongoConnectInProgress = false;

function sanitizeMongoUri(uri) {
  return uri.replace(/\/\/([^@]+)@/, "//***:***@");
}

async function isWritableMongoConnection() {
  try {
    let hello = await mongoose.connection.db.admin().command({ hello: 1 });
    return hello?.isWritablePrimary === true || hello?.ismaster === true;
  } catch (error) {
    let isMaster = await mongoose.connection.db.admin().command({ isMaster: 1 });
    return isMaster?.ismaster === true;
  }
}

function getUniqueMongoCandidates() {
  return [...new Set(mongoUriCandidates)].filter(Boolean);
}

function stopMongoReconnectLoop() {
  if (mongoReconnectTimer) {
    clearInterval(mongoReconnectTimer);
    mongoReconnectTimer = null;
  }
}

function startMongoReconnectLoop() {
  if (isProduction || mongoReconnectTimer) {
    return;
  }

  console.log(
    `MongoDB reconnect loop started (interval ${mongoReconnectIntervalMs}ms).`,
  );
  mongoReconnectTimer = setInterval(async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        let writable = await isWritableMongoConnection().catch(() => false);
        if (writable) {
          stopMongoReconnectLoop();
          return;
        }

        await mongoose.disconnect().catch(() => {});
      }

      console.log("Retrying MongoDB connection...");
      let connected = await connectMongo();
      if (connected) {
        stopMongoReconnectLoop();
      }
    } catch (error) {
      console.error(`MongoDB reconnect attempt failed: ${error.message}`);
    }
  }, mongoReconnectIntervalMs);
}

async function connectMongo() {
  if (mongoConnectInProgress) {
    return false;
  }

  mongoConnectInProgress = true;
  let lastError;

  try {
    for (const uri of getUniqueMongoCandidates()) {
      try {
        await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 5000,
          readPreference: "primary",
          retryWrites: true,
        });

        let isWritablePrimary = await isWritableMongoConnection();
        if (!isWritablePrimary) {
          lastError = new Error(
            `MongoDB node is not writable primary: ${sanitizeMongoUri(uri)}`,
          );
          console.error(lastError.message);
          await mongoose.disconnect();
          continue;
        }

        console.log(`MongoDB connected: ${sanitizeMongoUri(uri)}`);
        return true;
      } catch (err) {
        lastError = err;
        console.error(
          `MongoDB connect failed: ${sanitizeMongoUri(uri)} (${err.message})`,
        );
      }
    }

    if (isProduction && lastError) {
      throw lastError;
    }

    console.error(
      "MongoDB unavailable. Server will keep running, but DB-backed APIs may fail until DB is reachable.",
    );
    return false;
  } finally {
    mongoConnectInProgress = false;
  }
}

connectMongo()
  .then((connected) => {
    if (!connected) {
      startMongoReconnectLoop();
    }
  })
  .catch((err) => {
    console.error(`Fatal MongoDB error: ${err.message}`);
    if (isProduction) {
      process.exit(1);
      return;
    }
    startMongoReconnectLoop();
  });

mongoose.connection.on("connected", function () {
  console.log("connected");
  stopMongoReconnectLoop();
  startReservationExpiryJob();
  startPendingVnpayOrderExpiryJob();
});
mongoose.connection.on("disconnected", function () {
  console.log("disconnected");
  startMongoReconnectLoop();
});
mongoose.connection.on("error", function (err) {
  console.error(`MongoDB connection error: ${err.message}`);
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  let isNotWritablePrimary =
    err?.code === 10107 ||
    err?.codeName === "NotWritablePrimary" ||
    err?.message === "not primary";

  let statusCode = isNotWritablePrimary
    ? 503
    : err?.status || err?.statusCode || 500;
  let message = isNotWritablePrimary
    ? "MongoDB dang chuyen primary, vui long thu lai sau vai giay"
    : err?.message || "Internal Server Error";

  if (req.originalUrl && req.originalUrl.startsWith("/api/")) {
    return res.status(statusCode).send({ message });
  }

  res.locals.message = message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(statusCode);
  res.render("error");
});

module.exports = app;
