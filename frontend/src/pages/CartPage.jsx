import { Table, Button, Empty, Typography, Card, Space, message, Popconfirm } from 'antd';
import { DeleteOutlined, MinusOutlined, PlusOutlined, ShoppingOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { addToCart, removeFromCart, decreaseFromCart, fetchCart } from '../store/slices/cartSlice';
import { useEffect } from 'react';

const { Title, Text } = Typography;

export default function CartPage() {
    const { items } = useSelector(state => state.cart);
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

    const columns = [
        {
            title: 'Sản phẩm', dataIndex: 'product', key: 'product',
            render: (product) => (
                <Space>
                    <img src={product?.images?.[0] || 'https://i.imgur.com/cHddUCu.jpeg'}
                        alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />
                    <div>
                        <Link to={`/products/${product?._id}`} style={{ fontWeight: 600, color: '#1a1a2e' }}>
                            {product?.title || 'Sản phẩm'}
                        </Link>
                        <div><Text type="secondary">{product?.price?.toLocaleString('vi-VN')}đ</Text></div>
                    </div>
                </Space>
            )
        },
        {
            title: 'Số lượng', key: 'quantity', width: 160, align: 'center',
            render: (_, record) => (
                <Space>
                    <Button size="small" icon={<MinusOutlined />}
                        onClick={() => dispatch(decreaseFromCart({ productId: record.product?._id || record.productId }))} />
                    <span style={{ fontWeight: 600, minWidth: 30, textAlign: 'center', display: 'inline-block' }}>{record.quantity}</span>
                    <Button size="small" icon={<PlusOutlined />}
                        onClick={() => dispatch(addToCart({ productId: record.product?._id || record.productId }))} />
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
                <Popconfirm title="Xóa sản phẩm này?" onConfirm={() => dispatch(removeFromCart({ productId: record.product?._id || record.productId }))}>
                    <Button danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
            )
        }
    ];

    return (
        <section className="page-container" style={{ maxWidth: 920 }} aria-label="Giỏ hàng">
            <Title level={3}>🛒 Giỏ hàng ({items.length} sản phẩm)</Title>

            {items.length === 0 ? (
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
                    <Card className="surface-card" style={{ borderRadius: 12, marginBottom: 16 }}>
                        <Table dataSource={items} columns={columns} pagination={false}
                            rowKey={(r) => r.product?._id || r.productId} />
                    </Card>
                    <Card className="surface-card" style={{ borderRadius: 12 }} bodyStyle={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <Title level={4} style={{ margin: 0 }}>
                            Tổng: <span style={{ color: '#e74c3c' }}>{getTotal().toLocaleString('vi-VN')}đ</span>
                        </Title>
                        <Button type="primary" size="large"
                            onClick={() => user ? navigate('/checkout') : (message.info('Vui lòng đăng nhập'), navigate('/login'))}
                            style={{ height: 48, paddingInline: 30, borderRadius: 10, fontWeight: 700 }}>
                            Tiến hành thanh toán
                        </Button>
                    </Card>
                </>
            )}
        </section>
    );
}
