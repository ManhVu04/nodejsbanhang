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
    const dispatch = useDispatch();
    const navigate = useNavigate();

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

    const handleAddToCart = async () => {
        try {
            await dispatch(addToCart({ productId: product._id })).unwrap();
            message.success('Đã thêm vào giỏ hàng!');
        } catch (err) {
            message.error(err || 'Thêm thất bại');
        }
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

                            <Paragraph style={{ fontSize: 15, color: '#555', lineHeight: 1.8 }}>
                                {product.description || 'Chưa có mô tả sản phẩm.'}
                            </Paragraph>

                            <Divider />

                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                <Button type="primary" size="large" icon={<ShoppingCartOutlined />}
                                    onClick={handleAddToCart}
                                    style={{
                                        height: 50, paddingInline: 32, borderRadius: 10, fontWeight: 700,
                                        fontSize: 16
                                    }}>
                                    Thêm vào giỏ hàng
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
        </section>
    );
}
