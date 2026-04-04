import { Table, Button, Empty, Typography, Card, Space, message, Popconfirm, Tag, Alert } from 'antd';
import { DeleteOutlined, MinusOutlined, PlusOutlined, ShoppingOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { addToCart, removeFromCart, decreaseFromCart, fetchCart } from '../store/slices/cartSlice';
import { useEffect } from 'react';
import { resolveImageUrl } from '../utils/api';

const { Title, Text } = Typography;

export default function CartPage() {
    const { items, inactiveItems } = useSelector(state => state.cart);
    const { user } = useSelector(state => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) dispatch(fetchCart());
    }, [dispatch, user]);

    const getTotal = () => {
        return items.reduce((sum, item) => {
            const price = item.product?.price || 0;
            return sum + price * (item.quantity || 1);
        }, 0);
    };

    const totalCartItemGroups = Number(items?.length || 0) + Number(inactiveItems?.length || 0);

    const getUnavailableReasonLabel = (reason) => {
        if (reason === 'OUT_OF_STOCK') {
            return 'Het hang';
        }
        if (reason === 'PRODUCT_INACTIVE') {
            return 'Ngung ban';
        }
        if (reason === 'PRODUCT_REMOVED') {
            return 'Da xoa';
        }
        return 'Khong hoat dong';
    };

    const getProductId = (record) => record?.product?._id || record?.productId;

    const renderProductCell = (product, record, isInactive = false) => {
        const productId = getProductId(record);
        const title = product?.title || 'San pham khong con ton tai';
        const price = Number(product?.price || 0);
        const reasonLabel = getUnavailableReasonLabel(record?.unavailableReason);

        return (
            <Space style={{ opacity: isInactive ? 0.65 : 1 }}>
                <img
                    src={resolveImageUrl(product?.images?.[0])}
                    alt=""
                    style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }}
                />
                <div>
                    {productId ? (
                        <Link to={`/products/${productId}`} style={{ fontWeight: 600, color: '#1a1a2e' }}>
                            {title}
                        </Link>
                    ) : (
                        <span style={{ fontWeight: 600, color: '#595959' }}>{title}</span>
                    )}
                    <div>
                        <Text type="secondary">{price.toLocaleString('vi-VN')}đ</Text>
                    </div>
                    {isInactive ? <Tag color="default" style={{ marginTop: 4 }}>{reasonLabel}</Tag> : null}
                </div>
            </Space>
        );
    };

    const activeColumns = [
        {
            title: 'Sản phẩm', dataIndex: 'product', key: 'product',
            render: (product, record) => renderProductCell(product, record, false)
        },
        {
            title: 'Số lượng', key: 'quantity', width: 160, align: 'center',
            render: (_, record) => (
                <Space>
                    <Button size="small" icon={<MinusOutlined />}
                        onClick={() => dispatch(decreaseFromCart({ productId: getProductId(record) }))} />
                    <span style={{ fontWeight: 600, minWidth: 30, textAlign: 'center', display: 'inline-block' }}>{record.quantity}</span>
                    <Button size="small" icon={<PlusOutlined />}
                        disabled={Number(record?.availableStock || 0) <= Number(record?.quantity || 0)}
                        onClick={() => dispatch(addToCart({ productId: getProductId(record) }))} />
                </Space>
            )
        },
        {
            title: 'Thành tiền', key: 'subtotal', width: 140, align: 'right',
            render: (_, record) => (
                <Text strong style={{ color: '#e74c3c' }}>
                    {((record.product?.price || 0) * record.quantity).toLocaleString('vi-VN')}đ
                </Text>
            )
        },
        {
            title: '', key: 'action', width: 60,
            render: (_, record) => (
                <Popconfirm title="Xóa sản phẩm này?" onConfirm={() => dispatch(removeFromCart({ productId: getProductId(record) }))}>
                    <Button danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
            )
        }
    ];

    const inactiveColumns = [
        {
            title: 'Sản phẩm', dataIndex: 'product', key: 'product',
            render: (product, record) => renderProductCell(product, record, true)
        },
        {
            title: 'Số lượng', key: 'quantity', width: 120, align: 'center',
            render: (_, record) => <Text type="secondary">{record?.quantity || 0}</Text>
        },
        {
            title: 'Thành tiền', key: 'subtotal', width: 140, align: 'right',
            render: (_, record) => (
                <Text type="secondary">
                    {((record?.product?.price || 0) * Number(record?.quantity || 0)).toLocaleString('vi-VN')}đ
                </Text>
            )
        },
        {
            title: '', key: 'action', width: 80,
            render: (_, record) => (
                <Popconfirm title="Xóa sản phẩm này?" onConfirm={() => dispatch(removeFromCart({ productId: getProductId(record) }))}>
                    <Button danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
            )
        }
    ];

    return (
        <section className="page-container" style={{ maxWidth: 920 }} aria-label="Giỏ hàng">
            <Title level={3}>🛒 Giỏ hàng ({totalCartItemGroups} sản phẩm)</Title>

            {totalCartItemGroups === 0 ? (
                <Card className="surface-card" style={{ textAlign: 'center', borderRadius: 12, padding: 40 }}>
                    <Empty description="Giỏ hàng trống" />
                    <Link to="/products">
                        <Button type="primary" icon={<ShoppingOutlined />} style={{ marginTop: 16, borderRadius: 10 }}>
                            Tiếp tục mua sắm
                        </Button>
                    </Link>
                </Card>
            ) : (
                <>
                    {items.length > 0 ? (
                        <Card className="surface-card" style={{ borderRadius: 12, marginBottom: 16 }} title="Sản phẩm hoạt động">
                            <Table dataSource={items} columns={activeColumns} pagination={false}
                                rowKey={(r) => getProductId(r)} />
                        </Card>
                    ) : (
                        <Card className="surface-card" style={{ borderRadius: 12, marginBottom: 16 }}>
                            <Alert
                                type="warning"
                                showIcon
                                message="Giỏ hàng hiện không có sản phẩm hoạt động"
                                description="Vui lòng chọn sản phẩm khác để tiếp tục thanh toán"
                            />
                        </Card>
                    )}

                    {inactiveItems.length > 0 ? (
                        <Card className="surface-card" style={{ borderRadius: 12, marginBottom: 16 }} title="Danh sách sản phẩm không hoạt động">
                            <Table
                                dataSource={inactiveItems}
                                columns={inactiveColumns}
                                pagination={false}
                                rowKey={(r) => `${getProductId(r) || 'inactive'}-${r.quantity}`}
                            />
                        </Card>
                    ) : null}

                    <Card className="surface-card" style={{ borderRadius: 12 }} bodyStyle={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <Title level={4} style={{ margin: 0 }}>
                            Tổng: <span style={{ color: '#e74c3c' }}>{getTotal().toLocaleString('vi-VN')}đ</span>
                        </Title>
                        <Button type="primary" size="large"
                            disabled={items.length === 0}
                            onClick={() => {
                                if (!user) {
                                    message.info('Vui lòng đăng nhập');
                                    navigate('/login');
                                    return;
                                }

                                if (items.length === 0) {
                                    message.warning('Khong co san pham hoat dong de thanh toan');
                                    return;
                                }

                                navigate('/checkout');
                            }}
                            style={{ height: 48, paddingInline: 30, borderRadius: 10, fontWeight: 700 }}>
                            Tiến hành thanh toán
                        </Button>
                    </Card>
                </>
            )}
        </section>
    );
}
