import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Row, Col, Typography, Button, Tag, Divider, Spin, message, Image, Card, Breadcrumb } from 'antd';
import { ShoppingCartOutlined, HomeOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { addToCart } from '../store/slices/cartSlice';
import api from '../utils/api';

const { Title, Paragraph, Text } = Typography;

export default function ProductDetailPage() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [actionLoading, setActionLoading] = useState('');
    const [showStockLimitWarning, setShowStockLimitWarning] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const availableStock = Math.max(0, Number(product?.availableStock ?? 0));
    const maxSelectableQuantity = availableStock > 0 ? availableStock : 1;
    const isOutOfStock = availableStock < 1;

    useEffect(() => {
        let cancelled = false;

        api.get(`/products/${id}`).then((prodRes) => {
            if (!cancelled) {
                setProduct(prodRes.data);
            }
        }).catch(() => {
            if (!cancelled) {
                message.error('Không tìm thấy sản phẩm');
                navigate('/products');
            }
        }).finally(() => {
            if (!cancelled) {
                setLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [id, navigate]);

    const normalizeQuantity = (value) => {
        const nextQuantity = Number(value);
        if (!Number.isFinite(nextQuantity)) {
            return 1;
        }
        return Math.min(maxSelectableQuantity, Math.max(1, Math.trunc(nextQuantity)));
    };

    useEffect(() => {
        if (availableStock > 0) {
            setQuantity((currentQuantity) => Math.min(currentQuantity, availableStock));
        } else {
            setQuantity(1);
        }
        setShowStockLimitWarning(false);
    }, [availableStock]);

    const addSelectedQuantityToCart = async () => {
        if (!product?._id) {
            throw new Error('Sản phẩm không hợp lệ');
        }
        if (isOutOfStock) {
            throw new Error('Sản phẩm hiện đã hết hàng');
        }
        if (quantity > availableStock) {
            throw new Error('Số lượng bạn chọn vượt quá số lượng tồn kho');
        }

        for (let index = 0; index < quantity; index += 1) {
            await dispatch(addToCart({ productId: product?._id })).unwrap();
        }
    };

    const handleAddToCart = async () => {
        try {
            setActionLoading('cart');
            await addSelectedQuantityToCart();
            message.success(`Đã thêm ${quantity} sản phẩm vào giỏ hàng!`);
        } catch (err) {
            message.error(err?.message || err || 'Thêm thất bại');
        } finally {
            setActionLoading('');
        }
    };

    const handleBuyNow = async () => {
        try {
            setActionLoading('buyNow');
            await addSelectedQuantityToCart();
            navigate('/checkout');
        } catch (err) {
            message.error(err?.message || err || 'Mua ngay thất bại');
        } finally {
            setActionLoading('');
        }
    };

    const handleDecreaseQuantity = () => {
        setQuantity((currentQuantity) => normalizeQuantity(currentQuantity - 1));
        setShowStockLimitWarning(false);
    };

    const handleIncreaseQuantity = () => {
        if (availableStock > 0 && quantity >= availableStock) {
            setShowStockLimitWarning(true);
            return;
        }

        setQuantity((currentQuantity) => normalizeQuantity(currentQuantity + 1));
        setShowStockLimitWarning(false);
    };

    const handleQuantityInputChange = (event) => {
        const rawValue = event?.target?.value;
        const nextQuantity = Number(rawValue);
        const isExceeded = availableStock > 0 && Number.isFinite(nextQuantity) && nextQuantity > availableStock;

        setShowStockLimitWarning(isExceeded);
        setQuantity(normalizeQuantity(rawValue));
    };

    if (loading) return <div className="page-container" style={{ textAlign: 'center', paddingBlock: 80 }}><Spin size="large" /></div>;
    if (!product) return null;

    const imageUrl = product.images?.[0] || 'https://i.imgur.com/cHddUCu.jpeg';

    return (
        <section className="product-detail" aria-label="Chi tiết sản phẩm">
            <Breadcrumb style={{ marginBottom: 16 }} items={[
                { title: <a onClick={() => navigate('/')}><HomeOutlined /> Trang chủ</a> },
                { title: <a onClick={() => navigate('/products')}>Sản phẩm</a> },
                { title: product.title }
            ]} />

            <Card className="surface-card" style={{ borderRadius: 16, overflow: 'hidden' }} bodyStyle={{ padding: 0 }}>
                <Row>
                    <Col xs={24} md={12}>
                        <div style={{ padding: 24, background: '#fafafa', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                            <Image
                                src={imageUrl}
                                alt={product.title}
                                style={{ maxHeight: 400, objectFit: 'contain', borderRadius: 8 }}
                                preview={{ mask: 'Xem ảnh lớn' }}
                            />
                        </div>
                    </Col>
                    <Col xs={24} md={12}>
                        <div style={{ padding: 32 }}>
                            {product.category?.name && <Tag color="default">{product.category.name}</Tag>}
                            <Title level={2} style={{ marginTop: 8, marginBottom: 8 }}>{product.title}</Title>
                            <Text type="secondary">SKU: {product.sku}</Text>

                            <Divider />

                            <Title level={2} style={{ color: '#e74c3c', margin: '0 0 16px' }}>
                                {product.price?.toLocaleString('vi-VN')}đ
                            </Title>

                            <Divider />

                            <div style={{ marginBottom: 20 }}>
                                <Text strong style={{ display: 'block', marginBottom: 10 }}>Số lượng</Text>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #d9d9d9', borderRadius: 10, overflow: 'hidden' }}>
                                        <Button
                                            type="text"
                                            onClick={handleDecreaseQuantity}
                                            style={{ width: 44, height: 44, borderRadius: 0 }}
                                            disabled={isOutOfStock}
                                        >
                                            -
                                        </Button>
                                        <input
                                            value={quantity}
                                            onChange={handleQuantityInputChange}
                                            style={{
                                                width: 64,
                                                height: 44,
                                                border: 'none',
                                                borderInline: '1px solid #d9d9d9',
                                                textAlign: 'center',
                                                outline: 'none',
                                                fontWeight: 600
                                            }}
                                            disabled={isOutOfStock}
                                        />
                                        <Button
                                            type="text"
                                            onClick={handleIncreaseQuantity}
                                            style={{ width: 44, height: 44, borderRadius: 0 }}
                                            disabled={isOutOfStock}
                                        >
                                            +
                                        </Button>
                                    </div>
                                    <Text type="secondary">{availableStock.toLocaleString('vi-VN')} sản phẩm có sẵn</Text>
                                </div>
                                {showStockLimitWarning && (
                                    <Text style={{ color: '#ff4d4f', display: 'block', marginTop: 10 }}>
                                        Số lượng bạn chọn đã đạt mức tối đa của sản phẩm này
                                    </Text>
                                )}
                                {isOutOfStock && (
                                    <Text style={{ color: '#ff4d4f', display: 'block', marginTop: 10 }}>
                                        Sản phẩm hiện đã hết hàng
                                    </Text>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                <Button type="primary" size="large" icon={<ShoppingCartOutlined />}
                                    onClick={handleAddToCart}
                                    loading={actionLoading === 'cart'}
                                    disabled={isOutOfStock}
                                    style={{
                                        height: 50, paddingInline: 32, borderRadius: 10, fontWeight: 700,
                                        fontSize: 16
                                    }}>
                                    Thêm vào giỏ hàng
                                </Button>
                                <Button
                                    size="large"
                                    onClick={handleBuyNow}
                                    loading={actionLoading === 'buyNow'}
                                    disabled={isOutOfStock}
                                    style={{ height: 50, borderRadius: 10, fontWeight: 700 }}
                                >
                                    Mua ngay
                                </Button>
                                <Button size="large" onClick={() => navigate('/cart')}
                                    style={{ height: 50, borderRadius: 10, fontWeight: 600 }}>
                                    Xem giỏ hàng
                                </Button>
                            </div>
                        </div>
                    </Col>
                </Row>
            </Card>

            <Card className="surface-card" style={{ borderRadius: 16, marginTop: 20 }}>
                <Title level={4} style={{ marginTop: 0 }}>Mô tả sản phẩm</Title>
                <Paragraph style={{ fontSize: 15, color: '#555', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                    {product?.description || 'Chưa có mô tả sản phẩm.'}
                </Paragraph>
            </Card>

            <Card className="surface-card" style={{ borderRadius: 16, marginTop: 16 }}>
                <Title level={4} style={{ marginTop: 0 }}>Đánh giá sản phẩm</Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Tính năng đánh giá đang được hoàn thiện. Bạn có thể quay lại sau để gửi nhận xét.
                </Paragraph>
            </Card>
        </section>
    );
}
