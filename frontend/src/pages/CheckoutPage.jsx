import {
  Card,
  Button,
  Radio,
  Input,
  Typography,
  Divider,
  List,
  message,
  Select,
  Checkbox,
} from "antd";
import { CreditCardOutlined, DollarOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearCart, fetchCart } from "../store/slices/cartSlice";
import api from "../utils/api";

const { Title, Text } = Typography;
const { TextArea } = Input;
const MANUAL_ADDRESS_OPTION = "__manual_address__";

export default function CheckoutPage() {
  const { items } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [shippingAddress, setShippingAddress] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(
    MANUAL_ADDRESS_OPTION,
  );
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(false);
  const [setAsDefaultAddress, setSetAsDefaultAddress] = useState(false);
  const [note, setNote] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherInfo, setVoucherInfo] = useState(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      dispatch(fetchCart());
    }
  }, [dispatch, user]);

  useEffect(() => {
    let shouldIgnore = false;

    async function fetchAddresses() {
      if (!user?._id) {
        setAddresses([]);
        setSelectedAddressId(MANUAL_ADDRESS_OPTION);
        return;
      }

      try {
        setAddressesLoading(true);
        let response = await api.get("/addresses");
        let nextAddresses = Array.isArray(response?.data?.addresses)
          ? response?.data?.addresses
          : [];

        if (shouldIgnore) {
          return;
        }

        setAddresses(nextAddresses);

        if (nextAddresses.length > 0) {
          let defaultAddress =
            nextAddresses.find((addressItem) => addressItem?.isDefault) ||
            nextAddresses?.[0];
          setSelectedAddressId(defaultAddress?._id || MANUAL_ADDRESS_OPTION);
          setShippingAddress(
            String(
              defaultAddress?.formattedAddress ||
                defaultAddress?.addressLine ||
                "",
            ).trim(),
          );
        } else {
          setSelectedAddressId(MANUAL_ADDRESS_OPTION);
        }
      } catch (err) {
        if (!shouldIgnore) {
          message.error(
            err?.response?.data?.message || "Khong tai duoc danh sach dia chi",
          );
        }
      } finally {
        if (!shouldIgnore) {
          setAddressesLoading(false);
        }
      }
    }

    fetchAddresses();

    return () => {
      shouldIgnore = true;
    };
  }, [user?._id]);

  const total = items.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0,
  );
  const discountAmount = voucherInfo?.discountAmount || 0;
  const finalTotal = Math.max(0, total - discountAmount);
  const selectedAddress =
    addresses.find((addressItem) => addressItem?._id === selectedAddressId) ||
    null;
  const isUsingSavedAddress =
    selectedAddressId !== MANUAL_ADDRESS_OPTION &&
    Boolean(selectedAddress?._id);
  const resolvedShippingAddress = isUsingSavedAddress
    ? String(
        selectedAddress?.formattedAddress || selectedAddress?.addressLine || "",
      ).trim()
    : String(shippingAddress || "").trim();

  const handleAddressSelection = (value) => {
    setSelectedAddressId(value);

    if (value === MANUAL_ADDRESS_OPTION) {
      return;
    }

    let chosenAddress = addresses.find(
      (addressItem) => addressItem?._id === value,
    );
    setShippingAddress(
      String(
        chosenAddress?.formattedAddress || chosenAddress?.addressLine || "",
      ).trim(),
    );
    setSaveAddressForFuture(false);
    setSetAsDefaultAddress(false);
  };

  const handleApplyVoucher = async () => {
    let code = voucherCode.trim();
    if (!code) {
      setVoucherInfo(null);
      return;
    }

    try {
      setVoucherLoading(true);
      let response = await api.get(
        `/vouchers/validate/${encodeURIComponent(code)}`,
        {
          params: {
            subtotal: total,
          },
        },
      );
      setVoucherInfo(response.data);
      message.success(`Da ap dung voucher ${response.data.code}`);
    } catch (err) {
      setVoucherInfo(null);
      message.error(err.response?.data?.message || "Voucher khong hop le");
    } finally {
      setVoucherLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!resolvedShippingAddress) {
      message.error("Vui lòng nhập địa chỉ giao hàng");
      return;
    }

    setLoading(true);
    try {
      let activeShippingAddressId = isUsingSavedAddress
        ? selectedAddress?._id
        : null;

      if (!activeShippingAddressId && saveAddressForFuture) {
        let createAddressResponse = await api.post("/addresses", {
          label: "Dia chi giao hang",
          recipientName: String(user?.fullName || user?.username || "").trim(),
          addressLine: resolvedShippingAddress,
          isDefault: setAsDefaultAddress,
        });

        let createdAddress = createAddressResponse?.data?.address || null;
        activeShippingAddressId = createdAddress?._id || null;

        if (createdAddress?._id) {
          setAddresses((currentAddresses) => {
            let filteredAddresses = currentAddresses.filter(
              (item) => item?._id !== createdAddress?._id,
            );
            let nextAddresses = [createdAddress, ...filteredAddresses];

            if (createdAddress?.isDefault) {
              nextAddresses = nextAddresses.map((item) => ({
                ...item,
                isDefault: item?._id === createdAddress?._id,
              }));
            }

            return nextAddresses;
          });
          setSelectedAddressId(createdAddress?._id);
        }
      }

      const res = await api.post("/orders", {
        paymentMethod,
        shippingAddress: resolvedShippingAddress,
        shippingAddressId: activeShippingAddressId,
        note,
        voucherCode: voucherInfo?.code || "",
      });
      dispatch(clearCart());
      await dispatch(fetchCart());

      if (paymentMethod === "VNPay") {
        // Get VNPay payment URL
        const payRes = await api.post("/vnpay/create-payment-url", {
          orderId: res.data.order._id,
        });
        window.location.href = payRes.data.paymentUrl;
      } else {
        message.success("Đặt hàng thành công!");
        navigate("/orders");
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Đặt hàng thất bại");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    navigate("/cart");
    return null;
  }

  return (
    <section
      className="page-container"
      style={{ maxWidth: 920 }}
      aria-label="Thanh toán"
    >
      <Title level={3}>💳 Thanh toán</Title>

      <div className="checkout-grid">
        <div>
          <Card
            title="Thông tin giao hàng"
            className="surface-card"
            style={{ borderRadius: 12, marginBottom: 16 }}
          >
            <div style={{ marginBottom: 12 }}>
              <Text strong>Người nhận:</Text> {user?.fullName || user?.username}
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>Email:</Text> {user?.email}
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Địa chỉ giao hàng *</Text>
            </div>
            {addresses.length > 0 ? (
              <div style={{ marginBottom: 12 }}>
                <Select
                  value={selectedAddressId}
                  onChange={handleAddressSelection}
                  loading={addressesLoading}
                  style={{ width: "100%" }}
                  options={[
                    ...addresses.map((addressItem) => ({
                      value: addressItem?._id,
                      label: `${addressItem?.isDefault ? "[Mac dinh] " : ""}${addressItem?.formattedAddress || addressItem?.addressLine || ""}`,
                    })),
                    {
                      value: MANUAL_ADDRESS_OPTION,
                      label: "Nhap dia chi moi",
                    },
                  ]}
                />
              </div>
            ) : null}

            {isUsingSavedAddress ? (
              <div
                style={{
                  padding: 12,
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  background: "#fafafa",
                }}
              >
                <Text>{resolvedShippingAddress}</Text>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Nhập địa chỉ giao hàng"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                />
                <div style={{ marginTop: 10 }}>
                  <Checkbox
                    checked={saveAddressForFuture}
                    onChange={(event) =>
                      setSaveAddressForFuture(event?.target?.checked === true)
                    }
                  >
                    Lưu địa chỉ này cho lần sau
                  </Checkbox>
                </div>
                {saveAddressForFuture ? (
                  <div style={{ marginTop: 8 }}>
                    <Checkbox
                      checked={setAsDefaultAddress}
                      onChange={(event) =>
                        setSetAsDefaultAddress(event?.target?.checked === true)
                      }
                    >
                      Dat lam dia chi mac dinh
                    </Checkbox>
                  </div>
                ) : null}
              </>
            )}
            <div style={{ marginTop: 12, marginBottom: 8 }}>
              <Text strong>Ghi chú</Text>
            </div>
            <TextArea
              rows={3}
              placeholder="Ghi chú cho đơn hàng (tùy chọn)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Card>

          <Card
            title="Phương thức thanh toán"
            className="surface-card"
            style={{ borderRadius: 12 }}
          >
            <Radio.Group
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <Radio
                value="COD"
                style={{
                  padding: 12,
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                }}
              >
                <DollarOutlined style={{ marginRight: 8 }} /> Thanh toán khi
                nhận hàng (COD)
              </Radio>
              <Radio
                value="VNPay"
                style={{
                  padding: 12,
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                }}
              >
                <CreditCardOutlined style={{ marginRight: 8 }} /> Thanh toán qua
                VNPay
              </Radio>
            </Radio.Group>
          </Card>
        </div>

        <div className="checkout-grid__summary">
          <Card
            title="Đơn hàng"
            className="surface-card"
            style={{ borderRadius: 12 }}
          >
            <List
              dataSource={items}
              renderItem={(item) => (
                <List.Item style={{ padding: "8px 0" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <Text ellipsis style={{ maxWidth: 160 }}>
                      {item.product?.title}
                    </Text>
                    <Text>x{item.quantity}</Text>
                  </div>
                </List.Item>
              )}
            />
            <Divider style={{ margin: "8px 0" }} />
            <div style={{ marginBottom: 12 }}>
              <Text strong>Ma giam gia</Text>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Input
                  value={voucherCode}
                  onChange={(event) =>
                    setVoucherCode(event.target.value.toUpperCase())
                  }
                  placeholder="Nhap voucher"
                />
                <Button onClick={handleApplyVoucher} loading={voucherLoading}>
                  Ap dung
                </Button>
              </div>
              {voucherInfo ? (
                <Text type="success" style={{ display: "block", marginTop: 6 }}>
                  {voucherInfo.code}: -{discountAmount.toLocaleString("vi-VN")}d
                </Text>
              ) : null}
            </div>
            <Divider style={{ margin: "8px 0" }} />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <Text>Tam tinh</Text>
              <Text>{total.toLocaleString("vi-VN")}d</Text>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <Text>Giam gia</Text>
              <Text type="danger">
                -{discountAmount.toLocaleString("vi-VN")}d
              </Text>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Title level={4} style={{ margin: 0 }}>
                Tổng
              </Title>
              <Title level={4} style={{ margin: 0, color: "#e74c3c" }}>
                {finalTotal.toLocaleString("vi-VN")}đ
              </Title>
            </div>
            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              onClick={handlePlaceOrder}
              style={{
                marginTop: 16,
                height: 48,
                borderRadius: 10,
                fontWeight: 700,
              }}
            >
              {paymentMethod === "VNPay" ? "Thanh toán VNPay" : "Đặt hàng"}
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
}
