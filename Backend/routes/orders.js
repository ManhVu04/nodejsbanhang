var express = require("express");
var router = express.Router();
let mongoose = require("mongoose");
let { CheckLogin, CheckRole } = require("../utils/authHandler");
let orderModel = require("../schemas/orders");
let cartModel = require("../schemas/carts");
let inventoryModel = require("../schemas/inventories");
let inventoryLogModel = require("../schemas/inventoryLogs");
let paymentModel = require("../schemas/payments");
let productModel = require("../schemas/products");
let voucherModel = require("../schemas/vouchers");
let addressModel = require("../schemas/addresses");
let { sendOrderConfirmationMail } = require("../utils/mailHandler");
let crypto = require("crypto");
let {
  normalizeVoucherCode,
  validateVoucherForOrder,
} = require("../utils/voucherHandler");

const ORDER_STATUS_TRANSITIONS = {
  Pending: ["Paid", "Shipped", "Cancelled"],
  Paid: ["Shipped", "Cancelled"],
  Shipped: ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

function getAllowedNextStatuses(order) {
  let next = ORDER_STATUS_TRANSITIONS[order.status] || [];

  // For online payment orders, shipping is only allowed after payment is confirmed.
  if (order.paymentMethod === "VNPay" && order.status === "Pending") {
    next = next.filter((value) => value !== "Shipped");
  }

  return next;
}

function resolveShippingAddress(selectedAddress, rawShippingAddress) {
  let fromSavedAddress = String(
    selectedAddress?.formattedAddress || selectedAddress?.addressLine || "",
  ).trim();
  if (fromSavedAddress) {
    return fromSavedAddress;
  }

  return String(rawShippingAddress || "").trim();
}

function getAvailableStock(inventoryItem) {
  return Math.max(
    0,
    Number(inventoryItem?.stock || 0) - Number(inventoryItem?.reserved || 0),
  );
}

function getCartProductId(cartItem) {
  return String(cartItem?.product || "").trim();
}

// POST / — Place order (transaction-based concurrency control)
router.post("/", CheckLogin, async function (req, res) {
  let session = await mongoose.startSession();
  session.startTransaction();
  try {
    let user = req.user;
    let {
      paymentMethod,
      shippingAddress,
      note,
      voucherCode,
      shippingAddressId,
    } = req.body || {};
    let normalizedVoucherCode = normalizeVoucherCode(voucherCode);

    if (!paymentMethod || !["COD", "VNPay"].includes(paymentMethod)) {
      throw new Error("Phương thức thanh toán không hợp lệ");
    }

    let selectedAddress = null;
    if (shippingAddressId) {
      if (!mongoose.isValidObjectId(shippingAddressId)) {
        throw new Error("Dia chi giao hang khong hop le");
      }

      selectedAddress = await addressModel
        .findOne({
          _id: shippingAddressId,
          user: user?._id,
          isDeleted: false,
        })
        .session(session);

      if (!selectedAddress) {
        throw new Error("Dia chi giao hang khong ton tai");
      }
    }

    let resolvedShippingAddress = resolveShippingAddress(
      selectedAddress,
      shippingAddress,
    );
    if (!resolvedShippingAddress) {
      throw new Error("Dia chi giao hang khong duoc de trong");
    }

    // Get user's cart
    let cart = await cartModel.findOne({ user: user._id }).session(session);
    if (!cart || cart.products.length === 0) {
      throw new Error("Giỏ hàng trống");
    }

    let cartProductIds = Array.from(
      new Set(
        (cart?.products || [])
          .map((cartItem) => getCartProductId(cartItem))
          .filter((productId) => mongoose.isValidObjectId(productId)),
      ),
    );

    let [cartProducts, cartInventories] = await Promise.all([
      productModel
        .find({
          _id: { $in: cartProductIds },
        })
        .session(session),
      inventoryModel
        .find({
          product: { $in: cartProductIds },
        })
        .session(session),
    ]);

    let cartProductMap = new Map(
      cartProducts.map((product) => [String(product?._id || ""), product]),
    );
    let cartInventoryMap = new Map(
      cartInventories.map((inventory) => [String(inventory?.product || ""), inventory]),
    );

    let inactiveProductIds = new Set();
    let activeCartItems = [];

    for (let cartItem of cart?.products || []) {
      let productId = getCartProductId(cartItem);
      let product = cartProductMap.get(productId) || null;
      let inventoryItem = cartInventoryMap.get(productId) || null;
      let availableStock = getAvailableStock(inventoryItem);

      if (!product || product?.isDeleted === true || availableStock < 1) {
        inactiveProductIds.add(productId);
        continue;
      }

      activeCartItems.push({ cartItem, product });
    }

    if (activeCartItems.length === 0) {
      throw new Error("Gio hang khong co san pham kha dung de thanh toan");
    }

    let orderItems = [];
    let subTotalPrice = 0;

    // For each cart item: atomically deduct stock to prevent over-selling
    for (let activeItem of activeCartItems) {
      let cartItem = activeItem?.cartItem;
      let product = activeItem?.product;

      let qty = cartItem.quantity;

      // Atomic update: only succeeds if stock >= qty (prevents over-selling)
      let inventoryUpdate = await inventoryModel.findOneAndUpdate(
        {
          product: product._id,
          stock: { $gte: qty },
        },
        {
          $inc: { stock: -qty, soldCount: qty },
        },
        { new: true, session },
      );

      if (!inventoryUpdate) {
        throw new Error(
          `Sản phẩm "${product.title}" không đủ số lượng trong kho`,
        );
      }

      let subtotal = product.price * qty;
      orderItems.push({
        product: product._id,
        quantity: qty,
        priceAtPurchase: product.price,
        subtotal: subtotal,
      });
      subTotalPrice += subtotal;

      // Log inventory out
      await new inventoryLogModel({
        product: product._id,
        type: "OUT",
        quantity: qty,
        reason: "Đặt hàng",
        performedBy: user._id,
      }).save({ session });
    }

    let discountAmount = 0;
    let appliedVoucher = null;

    if (normalizedVoucherCode) {
      let voucher = await voucherModel
        .findOne({
          code: normalizedVoucherCode,
          isDeleted: false,
        })
        .session(session);

      let validation = validateVoucherForOrder(voucher, subTotalPrice);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      if (voucher.perUserLimit) {
        let usedByUser = await orderModel
          .countDocuments({
            user: user._id,
            "voucher.code": voucher.code,
            status: { $ne: "Cancelled" },
          })
          .session(session);

        if (usedByUser >= voucher.perUserLimit) {
          throw new Error("Ban da dung het luot cho ma voucher nay");
        }
      }

      discountAmount = validation.discount;
      appliedVoucher = voucher;
    }

    let totalPrice = Math.max(0, subTotalPrice - discountAmount);

    // Create order
    let newOrder = new orderModel({
      user: user._id,
      items: orderItems,
      subTotalPrice: subTotalPrice,
      discountAmount: discountAmount,
      totalPrice: totalPrice,
      status: paymentMethod === "COD" ? "Pending" : "Pending",
      paymentMethod: paymentMethod,
      shippingAddress: resolvedShippingAddress,
      shippingAddressId: selectedAddress?._id || null,
      note: note || "",
      voucher: appliedVoucher
        ? {
            voucherId: appliedVoucher._id,
            code: appliedVoucher.code,
          }
        : { code: "" },
    });
    await newOrder.save({ session });

    // Create payment record
    let idempotencyKey = crypto.randomUUID();
    let newPayment = new paymentModel({
      order: newOrder._id,
      user: user._id,
      method: paymentMethod,
      amount: totalPrice,
      status: paymentMethod === "COD" ? "pending" : "pending",
      idempotencyKey: idempotencyKey,
    });
    await newPayment.save({ session });

    if (appliedVoucher) {
      appliedVoucher.usedCount += 1;
      await appliedVoucher.save({ session });
    }

    // Keep unavailable items in cart and only clear checked-out active items.
    cart.products = (cart?.products || []).filter((cartItem) =>
      inactiveProductIds.has(getCartProductId(cartItem)),
    );
    await cart.save({ session });

    await session.commitTransaction();
    await session.endSession();

    // Send confirmation email (async, non-blocking)
    await newOrder.populate("items.product");
    try {
      await sendOrderConfirmationMail(user.email, newOrder);
    } catch (emailErr) {
      console.error("Email send failed:", emailErr?.message || emailErr);
    }

    res.send({
      message: "Đặt hàng thành công",
      order: newOrder,
      payment: newPayment,
    });
  } catch (err) {
    await session.abortTransaction();
    await session.endSession();
    res.status(400).send({ message: err.message });
  }
});

// GET / — User's order history
router.get("/", CheckLogin, async function (req, res) {
  try {
    let { page = 1, limit = 10, status } = req.query;
    let filter = { user: req.user._id };
    if (status) filter.status = status;

    let orders = await orderModel
      .find(filter)
      .populate("items.product", "title images price slug")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    let total = await orderModel.countDocuments(filter);

    res.send({
      orders,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// GET /admin/all — Admin: all orders
router.get(
  "/admin/all",
  CheckLogin,
  CheckRole(["Admin"]),
  async function (req, res) {
    try {
      let { page = 1, limit = 10, status } = req.query;
      let filter = {};
      if (status) filter.status = status;

      let orders = await orderModel
        .find(filter)
        .populate("user", "username email fullName")
        .populate("items.product", "title images price slug")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      let total = await orderModel.countDocuments(filter);

      res.send({
        orders,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  },
);

// GET /:id — Order detail
router.get("/:id", CheckLogin, async function (req, res) {
  try {
    let order = await orderModel
      .findById(req.params.id)
      .populate("items.product", "title images price slug description")
      .populate("user", "username email fullName");

    if (!order) {
      return res.status(404).send({ message: "Đơn hàng không tồn tại" });
    }

    // Only allow owner or admin
    let isAdmin = req.user.role && req.user.role.name === "Admin";
    if (order.user._id.toString() !== req.user._id.toString() && !isAdmin) {
      return res
        .status(403)
        .send({ message: "Không có quyền xem đơn hàng này" });
    }

    let payment = await paymentModel.findOne({ order: order._id });

    res.send({ order, payment });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// PUT /:id/status — Admin: update order status
router.put(
  "/:id/status",
  CheckLogin,
  CheckRole(["Admin"]),
  async function (req, res) {
    try {
      let { status } = req.body;
      let validStatuses = [
        "Pending",
        "Paid",
        "Shipped",
        "Delivered",
        "Cancelled",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).send({ message: "Trạng thái không hợp lệ" });
      }

      let existingOrder = await orderModel
        .findById(req.params.id)
        .populate("items.product", "title images price");

      if (!existingOrder) {
        return res.status(404).send({ message: "Đơn hàng không tồn tại" });
      }

      if (existingOrder.status === status) {
        return res.send({
          message: "Trạng thái đơn hàng không thay đổi",
          order: existingOrder,
        });
      }

      let allowedNextStatuses = getAllowedNextStatuses(existingOrder);
      if (!allowedNextStatuses.includes(status)) {
        if (existingOrder.status === "Cancelled") {
          return res
            .status(400)
            .send({ message: "Đơn đã hủy không thể chuyển trạng thái khác" });
        }
        if (existingOrder.status === "Delivered") {
          return res
            .status(400)
            .send({
              message: "Đơn đã giao là trạng thái kết thúc, không thể đổi tiếp",
            });
        }
        return res.status(400).send({
          message: `Không thể chuyển từ ${existingOrder.status} sang ${status}`,
          allowedNextStatuses,
        });
      }

      let payment = await paymentModel.findOne({ order: existingOrder._id });

      if (status === "Paid" && existingOrder.paymentMethod === "VNPay") {
        if (!payment || payment.status !== "paid") {
          return res.status(400).send({
            message:
              "VNPay chưa xác nhận thanh toán thành công, không thể chuyển trạng thái Paid thủ công",
          });
        }
      }

      // If cancelled, restore stock
      if (status === "Cancelled") {
        let session = await mongoose.startSession();
        session.startTransaction();
        try {
          let paymentInTx = await paymentModel
            .findOne({ order: existingOrder._id })
            .session(session);

          for (let item of existingOrder.items) {
            await inventoryModel.findOneAndUpdate(
              { product: item.product._id || item.product },
              { $inc: { stock: item.quantity, soldCount: -item.quantity } },
              { session },
            );
            await new inventoryLogModel({
              product: item.product._id || item.product,
              type: "IN",
              quantity: item.quantity,
              reason: "Hủy đơn hàng #" + existingOrder._id,
              order: existingOrder._id,
              performedBy: req.user._id,
            }).save({ session });
          }

          if (existingOrder.voucher && existingOrder.voucher.voucherId) {
            await voucherModel.findOneAndUpdate(
              {
                _id: existingOrder.voucher.voucherId,
                usedCount: { $gt: 0 },
              },
              { $inc: { usedCount: -1 } },
              { session },
            );
          }

          if (paymentInTx && paymentInTx.status === "paid") {
            paymentInTx.status = "refunded";
            paymentInTx.providerResponse = {
              ...(paymentInTx.providerResponse || {}),
              autoRefundOnCancel: true,
              refundAt: new Date().toISOString(),
            };
            await paymentInTx.save({ session });
          }

          await orderModel.findByIdAndUpdate(
            existingOrder._id,
            { status: "Cancelled" },
            { session },
          );

          await session.commitTransaction();
          await session.endSession();

          let updatedOrder = await orderModel
            .findById(existingOrder._id)
            .populate("items.product", "title images price");
          return res.send({
            message: "Cập nhật trạng thái thành công",
            order: updatedOrder,
          });
        } catch (txErr) {
          await session.abortTransaction();
          await session.endSession();
          return res.status(400).send({ message: txErr.message });
        }
      }

      let order = await orderModel
        .findByIdAndUpdate(req.params.id, { status }, { new: true })
        .populate("items.product", "title images price");

      // If marked as Paid, update payment
      if (status === "Paid") {
        let paidUpdate = { status: "paid" };
        if (!payment || !payment.paidAt) {
          paidUpdate.paidAt = new Date();
        }

        await paymentModel.findOneAndUpdate({ order: order._id }, paidUpdate);
      }

      if (status === "Delivered" && existingOrder.paymentMethod === "COD") {
        await paymentModel.findOneAndUpdate(
          { order: order._id, method: "COD" },
          { status: "paid", paidAt: new Date() },
        );
      }

      res.send({ message: "Cập nhật trạng thái thành công", order });
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  },
);

module.exports = router;
