var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
let mongoose = require("mongoose");
let cors = require("cors");
let helmet = require("helmet");
let { startReservationExpiryJob } = require("./utils/reservationExpiryJob");
let {
  startPendingVnpayOrderExpiryJob,
} = require("./utils/pendingVnpayOrderExpiryJob");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");

var app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Security & CORS
app.use(helmet({ contentSecurityPolicy: false }));
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
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/", indexRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/categories", require("./routes/categories"));
app.use("/api/v1/products", require("./routes/products"));
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

const isProduction = process.env.NODE_ENV === "production";
const configuredMongoUri = (process.env.MONGODB_URI || "").trim();
const devMongoFallbackUris = [
  "mongodb://127.0.0.1:27017/nodejs?directConnection=true",
  "mongodb://127.0.0.1:27018/nodejs?directConnection=true",
  "mongodb://127.0.0.1:27019/nodejs?directConnection=true",
  "mongodb://localhost:27017/nodejs",
];
const mongoUriCandidates = configuredMongoUri
  ? isProduction
    ? [configuredMongoUri]
    : [configuredMongoUri, ...devMongoFallbackUris]
  : devMongoFallbackUris;

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

async function connectMongo() {
  let lastError;

  for (const uri of [...new Set(mongoUriCandidates)]) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

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
      return;
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
}

connectMongo().catch((err) => {
  console.error(`Fatal MongoDB error: ${err.message}`);
  if (isProduction) {
    process.exit(1);
  }
});

startReservationExpiryJob();
startPendingVnpayOrderExpiryJob();

mongoose.connection.on("connected", function () {
  console.log("connected");
});
mongoose.connection.on("disconnected", function () {
  console.log("disconnected");
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
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
