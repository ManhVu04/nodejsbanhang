import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  message,
  Divider,
  Avatar,
  Descriptions,
  Upload,
  Space,
  List,
  Tag,
  Empty,
  Modal,
  Popconfirm,
  Checkbox,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  UploadOutlined,
  DeleteOutlined,
  PlusOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import api, { resolveImageUrl } from "../utils/api";
import { useEffect, useState } from "react";
import { fetchMe } from "../store/slices/authSlice";

const { Title } = Typography;

export default function ProfilePage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [addressForm] = Form.useForm();
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [settingDefaultAddressId, setSettingDefaultAddressId] = useState("");
  const [deletingAddressId, setDeletingAddressId] = useState("");

  useEffect(() => {
    profileForm.setFieldsValue({
      fullName: user?.fullName || "",
      email: user?.email || "",
      avatarUrl: user?.avatarUrl || "",
    });
  }, [profileForm, user?.fullName, user?.email, user?.avatarUrl]);

  const avatarField = Form.useWatch("avatarUrl", profileForm);
  const avatarPreviewValue =
    avatarField !== undefined ? avatarField : user?.avatarUrl || "";
  const resolvedAvatar =
    typeof avatarPreviewValue === "string" &&
    avatarPreviewValue.trim().length > 0
      ? resolveImageUrl(avatarPreviewValue)
      : undefined;
  const avatarSrc =
    typeof user?.avatarUrl === "string" && user.avatarUrl.trim().length > 0
      ? resolveImageUrl(user.avatarUrl)
      : undefined;
  const avatarText = (user?.fullName || user?.username || "U")
    .trim()
    .charAt(0)
    .toUpperCase();

  const getAddressTitle = (address) => {
    let label = String(address?.label || "Dia chi").trim();
    return label || "Dia chi";
  };

  const getAddressLine = (address) => {
    return String(
      address?.formattedAddress || address?.addressLine || "",
    ).trim();
  };

  const loadAddresses = async () => {
    try {
      setAddressesLoading(true);
      let response = await api.get("/addresses");
      let nextAddresses = Array.isArray(response?.data?.addresses)
        ? response?.data?.addresses
        : [];
      setAddresses(nextAddresses);
    } catch (err) {
      message.error(
        err?.response?.data?.message || "Khong tai duoc danh sach dia chi",
      );
    } finally {
      setAddressesLoading(false);
    }
  };

  useEffect(() => {
    if (!user?._id) {
      setAddresses([]);
      return;
    }

    let shouldIgnore = false;

    async function runLoadAddresses() {
      try {
        setAddressesLoading(true);
        let response = await api.get("/addresses");
        let nextAddresses = Array.isArray(response?.data?.addresses)
          ? response?.data?.addresses
          : [];
        if (!shouldIgnore) {
          setAddresses(nextAddresses);
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

    runLoadAddresses();

    return () => {
      shouldIgnore = true;
    };
  }, [user?._id]);

  const openCreateAddressModal = () => {
    setEditingAddress(null);
    addressForm.setFieldsValue({
      label: "Dia chi",
      recipientName: String(user?.fullName || user?.username || "").trim(),
      phoneNumber: "",
      addressLine: "",
      isDefault: false,
    });
    setAddressModalOpen(true);
  };

  const openEditAddressModal = (address) => {
    setEditingAddress(address);
    addressForm.setFieldsValue({
      label: String(address?.label || "Dia chi").trim(),
      recipientName: String(address?.recipientName || "").trim(),
      phoneNumber: String(address?.phoneNumber || "").trim(),
      addressLine: String(address?.addressLine || "").trim(),
      isDefault: address?.isDefault === true,
    });
    setAddressModalOpen(true);
  };

  const closeAddressModal = () => {
    setAddressModalOpen(false);
    setEditingAddress(null);
    addressForm.resetFields();
  };

  const saveAddress = async (values) => {
    try {
      setSavingAddress(true);

      let payload = {
        label: String(values?.label || "").trim(),
        recipientName: String(values?.recipientName || "").trim(),
        phoneNumber: String(values?.phoneNumber || "").trim(),
        addressLine: String(values?.addressLine || "").trim(),
        isDefault: values?.isDefault === true,
      };

      if (editingAddress?._id) {
        await api.put(`/addresses/${editingAddress?._id}`, payload);
        message.success("Cap nhat dia chi thanh cong");
      } else {
        await api.post("/addresses", payload);
        message.success("Tao dia chi thanh cong");
      }

      closeAddressModal();
      await loadAddresses();
    } catch (err) {
      message.error(err?.response?.data?.message || "Luu dia chi that bai");
    } finally {
      setSavingAddress(false);
    }
  };

  const setDefaultAddress = async (addressId) => {
    try {
      setSettingDefaultAddressId(addressId);
      await api.post(`/addresses/${addressId}/default`);
      message.success("Da cap nhat dia chi mac dinh");
      await loadAddresses();
    } catch (err) {
      message.error(
        err?.response?.data?.message || "Khong dat duoc dia chi mac dinh",
      );
    } finally {
      setSettingDefaultAddressId("");
    }
  };

  const deleteAddress = async (addressId) => {
    try {
      setDeletingAddressId(addressId);
      await api.delete(`/addresses/${addressId}`);
      message.success("Da xoa dia chi");
      await loadAddresses();
    } catch (err) {
      message.error(err?.response?.data?.message || "Xoa dia chi that bai");
    } finally {
      setDeletingAddressId("");
    }
  };

  const handleUploadAvatar = async ({ file, onSuccess, onError }) => {
    try {
      setUploadingAvatar(true);
      let formData = new FormData();
      formData.append("file", file);

      let response = await api.post("/upload/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      profileForm.setFieldValue("avatarUrl", response.data.filename);
      message.success("Da tai anh dai dien len server");
      if (onSuccess) {
        onSuccess(response.data, file);
      }
    } catch (err) {
      let statusCode = err.response?.status;
      let apiMessage = err.response?.data?.message;
      if (statusCode === 413) {
        message.error(
          "Anh vuot gioi han kich thuoc cua may chu (proxy). Vui long tang client_max_body_size tren server.",
        );
      } else {
        message.error(apiMessage || "Tai anh that bai");
      }
      if (onError) {
        onError(err);
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onUpdateProfile = async (values) => {
    try {
      setUpdatingProfile(true);
      await api.put("/users/me", {
        fullName: String(values.fullName || "").trim(),
        email: String(values.email || "").trim(),
        avatarUrl: String(values.avatarUrl || "").trim(),
      });

      await dispatch(fetchMe()).unwrap();
      message.success("Cap nhat thong tin tai khoan thanh cong");
    } catch (err) {
      message.error(
        err.response?.data?.message || "Cap nhat tai khoan that bai",
      );
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleClearAvatar = () => {
    profileForm.setFieldValue("avatarUrl", "");
    message.info('Da bo anh dai dien. Bam "Cap nhat thong tin" de luu.');
  };

  const onChangePassword = async (values) => {
    try {
      await api.post("/auth/changepassword", {
        oldpassword: values.oldpassword,
        newpassword: values.newpassword,
      });
      message.success("Đổi mật khẩu thành công!");
      passwordForm.resetFields();
    } catch (err) {
      message.error(err.response?.data || "Đổi mật khẩu thất bại");
    }
  };

  return (
    <section
      className="page-container"
      style={{ maxWidth: 640 }}
      aria-label="Tài khoản"
    >
      <Title level={3}>👤 Tài khoản</Title>

      <Card
        className="surface-card"
        style={{ borderRadius: 12, marginBottom: 24 }}
      >
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <Avatar
            src={avatarSrc}
            icon={!avatarSrc ? <UserOutlined /> : null}
            size={80}
            style={{ marginBottom: 12 }}
          >
            {!avatarSrc ? avatarText : null}
          </Avatar>
        </div>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Username">
            {user?.username}
          </Descriptions.Item>
          <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
          <Descriptions.Item label="Họ tên">
            {user?.fullName || "Chưa cập nhật"}
          </Descriptions.Item>
          <Descriptions.Item label="Role">
            {user?.role?.name || "N/A"}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <Form form={profileForm} layout="vertical" onFinish={onUpdateProfile}>
          <Form.Item
            name="fullName"
            label="Ho ten"
            rules={[
              { required: true, message: "Nhap ho ten" },
              { min: 2, message: "Ho ten toi thieu 2 ky tu" },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Nhap email" },
              { type: "email", message: "Email khong hop le" },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="avatarUrl" label="Anh dai dien">
            <Input readOnly placeholder="avatar filename" />
          </Form.Item>
          <Space direction="vertical" size={12}>
            <Space wrap>
              <Upload
                accept="image/*"
                maxCount={1}
                showUploadList={false}
                customRequest={handleUploadAvatar}
              >
                <Button icon={<UploadOutlined />} loading={uploadingAvatar}>
                  Tai anh dai dien tu may tinh
                </Button>
              </Upload>
              <Button
                icon={<DeleteOutlined />}
                onClick={handleClearAvatar}
                disabled={
                  !(
                    typeof avatarPreviewValue === "string" &&
                    avatarPreviewValue.trim().length > 0
                  )
                }
              >
                Xoa anh dai dien
              </Button>
            </Space>
            <Avatar src={resolvedAvatar} icon={<UserOutlined />} size={72} />
          </Space>
          <div style={{ marginTop: 16 }}>
            <Button type="primary" htmlType="submit" loading={updatingProfile}>
              Cap nhat thong tin
            </Button>
          </div>
        </Form>
      </Card>

      <Card
        title="🔒 Đổi mật khẩu"
        className="surface-card"
        style={{ borderRadius: 12 }}
      >
        <Form form={passwordForm} layout="vertical" onFinish={onChangePassword}>
          <Form.Item
            name="oldpassword"
            label="Mật khẩu cũ"
            rules={[{ required: true, message: "Nhập mật khẩu cũ" }]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Form.Item
            name="newpassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: "Nhập mật khẩu mới" },
              { min: 8, message: "Tối thiểu 8 ký tự" },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/,
                message: "Cần chữ hoa, chữ thường, số và ký tự đặc biệt",
              },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="Xác nhận"
            dependencies={["newpassword"]}
            rules={[
              { required: true, message: "Xác nhận mật khẩu" },
              ({ getFieldValue }) => ({
                validator(_, v) {
                  return !v || getFieldValue("newpassword") === v
                    ? Promise.resolve()
                    : Promise.reject("Không khớp");
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Button type="primary" htmlType="submit" style={{ borderRadius: 8 }}>
            Cập nhật mật khẩu
          </Button>
        </Form>
      </Card>

      <Card
        title="🏠 Dia chi giao hang"
        className="surface-card"
        style={{ borderRadius: 12, marginTop: 24 }}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateAddressModal}
          >
            Them dia chi
          </Button>
        }
      >
        <List
          loading={addressesLoading}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Ban chua co dia chi nao"
              />
            ),
          }}
          dataSource={addresses}
          renderItem={(address) => {
            let isSettingDefault = settingDefaultAddressId === address?._id;
            let isDeleting = deletingAddressId === address?._id;

            return (
              <List.Item
                actions={[
                  address?.isDefault ? (
                    <Tag color="green" key="default-tag">
                      Mac dinh
                    </Tag>
                  ) : (
                    <Button
                      key="set-default"
                      type="link"
                      loading={isSettingDefault}
                      onClick={() => setDefaultAddress(address?._id)}
                    >
                      Dat mac dinh
                    </Button>
                  ),
                  <Button
                    key="edit"
                    type="link"
                    onClick={() => openEditAddressModal(address)}
                  >
                    Sua
                  </Button>,
                  <Popconfirm
                    key="delete"
                    title="Xoa dia chi nay?"
                    okText="Xoa"
                    cancelText="Huy"
                    onConfirm={() => deleteAddress(address?._id)}
                  >
                    <Button danger type="link" loading={isDeleting}>
                      Xoa
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={<HomeOutlined />}
                  title={
                    <Space>
                      <span>{getAddressTitle(address)}</span>
                      {address?.isDefault ? (
                        <Tag color="green">Mac dinh</Tag>
                      ) : null}
                    </Space>
                  }
                  description={
                    <div>
                      <div>
                        <strong>Nguoi nhan:</strong>{" "}
                        {String(address?.recipientName || "Chua cap nhat")}
                      </div>
                      {address?.phoneNumber ? (
                        <div>
                          <strong>So dien thoai:</strong> {address?.phoneNumber}
                        </div>
                      ) : null}
                      <div>
                        <strong>Dia chi:</strong>{" "}
                        {getAddressLine(address) || "N/A"}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Card>

      <Modal
        title={editingAddress?._id ? "Cap nhat dia chi" : "Them dia chi moi"}
        open={addressModalOpen}
        onCancel={closeAddressModal}
        onOk={() => addressForm.submit()}
        okText={editingAddress?._id ? "Luu thay doi" : "Tao dia chi"}
        cancelText="Huy"
        confirmLoading={savingAddress}
        destroyOnHidden
      >
        <Form form={addressForm} layout="vertical" onFinish={saveAddress}>
          <Form.Item
            name="label"
            label="Nhan dia chi"
            rules={[{ required: true, message: "Nhap nhan dia chi" }]}
          >
            <Input placeholder="Vi du: Nha rieng" />
          </Form.Item>
          <Form.Item
            name="recipientName"
            label="Nguoi nhan"
            rules={[{ required: true, message: "Nhap ten nguoi nhan" }]}
          >
            <Input placeholder="Ho ten nguoi nhan" />
          </Form.Item>
          <Form.Item
            name="phoneNumber"
            label="So dien thoai"
            rules={[
              {
                pattern: /^[0-9+\-\s]{8,20}$/,
                message: "So dien thoai khong hop le",
              },
            ]}
          >
            <Input placeholder="So dien thoai (tuy chon)" />
          </Form.Item>
          <Form.Item
            name="addressLine"
            label="Dia chi chi tiet"
            rules={[
              { required: true, message: "Nhap dia chi chi tiet" },
              { min: 8, message: "Dia chi phai co it nhat 8 ky tu" },
            ]}
          >
            <Input.TextArea
              rows={3}
              placeholder="So nha, duong, phuong/xa, quan/huyen, tinh/thanh"
            />
          </Form.Item>
          <Form.Item name="isDefault" valuePropName="checked">
            <Checkbox>Dat lam dia chi mac dinh</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
